import { NextResponse } from 'next/server';
// @ts-ignore
import { dictionary as cmudict } from 'cmu-pronouncing-dictionary';

export async function POST(request: Request) {
  try {
    const { words } = await request.json();
    if (!words || !Array.isArray(words)) {
      return NextResponse.json({ error: 'Invalid words array' }, { status: 400 });
    }

    const WORDS_API_KEY = process.env.WORDS_API_KEY;
    const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

    if (!WORDS_API_KEY || !DEEPL_API_KEY) {
      return NextResponse.json({ 
        error: 'APIキーが設定されていません。.env.local ファイルを作成し、WORDS_API_KEY と DEEPL_API_KEY を設定してください。' 
      }, { status: 500 });
    }

    const results = [];

    for (const word of words) {
      const cleanWord = word.trim().toLowerCase();
      if (!cleanWord) continue;

      let phonetic = cmudict[cleanWord] || '';
      let paragraph = '';
      let japanese = '';
      let partOfSpeech = '';

      // 1. WordsAPI
      try {
        const wordsApiResponse = await fetch(`https://wordsapiv1.p.rapidapi.com/words/${cleanWord}`, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': WORDS_API_KEY,
            'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
          }
        });
        
        if (wordsApiResponse.ok) {
          const data = await wordsApiResponse.json();
          const resultsArray = data.results || [];
          
          // 例文を持つresultを優先的に探す
          let bestResult = resultsArray[0];
          for (const res of resultsArray) {
            if (res.examples && res.examples.length > 0) {
              bestResult = res;
              break;
            }
          }
          
          if (bestResult) {
            let rawExample = '';
            if (bestResult.examples && bestResult.examples.length > 0) {
              rawExample = bestResult.examples[0];
            } else if (process.env.OPENAI_API_KEY) {
              // OpenAI Fallback for missing examples
              try {
                const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      { role: 'system', content: 'You are a helpful assistant that generates short, natural English example sentences for vocabulary learning. Respond with ONLY the sentence, without quotes or extra text.' },
                      { role: 'user', content: `Generate a short English example sentence using the word "${cleanWord}".` }
                    ],
                    max_tokens: 40,
                    temperature: 0.7
                  })
                });
                if (openaiResponse.ok) {
                  const openaiData = await openaiResponse.json();
                  rawExample = openaiData.choices[0].message.content.trim();
                  rawExample = rawExample.replace(/^["']|["']$/g, '');
                }
              } catch (e) {
                console.error('OpenAI generation failed', e);
              }
            }

            if (rawExample) {
              // 1. まず完全一致で置換を試みる
              let regex = new RegExp(`\\b${cleanWord}\\b`, 'gi');
              paragraph = rawExample.replace(regex, '_');
              
              if (paragraph === rawExample) {
                // 2. 規則変化の活用形（複数形、過去形、進行形など）を許容する
                // 例: attempt -> attempts, attempted, attempting
                regex = new RegExp(`\\b${cleanWord}(s|es|ed|d|ing|er|est|ly)?\\b`, 'gi');
                paragraph = rawExample.replace(regex, '_[活用形]');
              }

              if (paragraph === rawExample && cleanWord.length >= 3) {
                // 3. 最後のフォールバック (不規則変化や子音の重なり run->running 等)
                // 単語の先頭3〜4文字が一致し、長さが近い単語を文全体から探して「単語ごと」置換
                const prefixLength = cleanWord.length >= 5 ? 4 : 3;
                const prefix = cleanWord.slice(0, prefixLength);
                const wordsInExample = rawExample.match(/\b[a-zA-Z]+\b/g) || [];
                
                const targetMatch = wordsInExample.find(w => 
                  w.toLowerCase().startsWith(prefix) && 
                  Math.abs(w.length - cleanWord.length) <= 4
                );
                
                if (targetMatch) {
                  const fallbackRegex = new RegExp(`\\b${targetMatch}\\b`, 'gi');
                  paragraph = rawExample.replace(fallbackRegex, '_[活用形]');
                }
              }
            } else {
              paragraph = `An example for _.`;
            }

            partOfSpeech = bestResult.partOfSpeech || '';
            const definition = bestResult.definition || '';
            
            // 発音記号 (WordsAPIのIPAを優先し、なければcmuのARPAbetを使う)
            let apiPhonetic = '';
            if (data.pronunciation) {
              if (typeof data.pronunciation === 'string') {
                apiPhonetic = data.pronunciation;
              } else if (data.pronunciation.all) {
                apiPhonetic = data.pronunciation.all;
              }
            }
            phonetic = apiPhonetic || cmudict[cleanWord] || '';
            
            // 2. DeepL Translation
            if (definition) {
              try {
                const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`
                  },
                  body: new URLSearchParams({
                    text: cleanWord, 
                    source_lang: 'EN', // 言語誤判定による珍訳を防ぐ
                    target_lang: 'JA'
                  })
                });

                if (deeplResponse.ok) {
                  const deeplData = await deeplResponse.json();
                  japanese = deeplData.translations[0].text;
                } else {
                  japanese = "翻訳失敗";
                }
              } catch (e) {
                console.error('DeepL translation failed', e);
              }
            }
          }
        } else {
          // If word not found in WordsAPI
          paragraph = "Word not found in API.";
        }
      } catch (error) {
        console.error('WordsAPI failed', error);
      }

      // ARPAbetの場合、小文字にして見栄えを整える
      if (phonetic && phonetic === cmudict[cleanWord]) {
        phonetic = phonetic.toLowerCase();
      }

      results.push({
        word: cleanWord,
        paragraph,
        japanese,
        phonetic,
        partOfSpeech
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Generator error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
