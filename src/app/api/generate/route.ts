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

          // WordsAPIのすべての意味リストを文字列化してOpenAIに渡す準備
          let definitionsList = '';
          if (resultsArray.length > 0) {
            definitionsList = resultsArray.slice(0, 10).map((res: any, index: number) =>
              `${index + 1}. partOfSpeech: ${res.partOfSpeech || 'unknown'}, definition: "${res.definition || ''}"`
            ).join('\n');
          }

          // 発音記号の取得
          let apiPhonetic = '';
          if (data.pronunciation) {
            if (typeof data.pronunciation === 'string') {
              apiPhonetic = data.pronunciation;
            } else if (data.pronunciation.all) {
              apiPhonetic = data.pronunciation.all;
            }
          }
          phonetic = apiPhonetic || cmudict[cleanWord] || '';

          // 2. OpenAIによるTOEIC特化の意味選定・翻訳・例文の同時生成
          let rawExample = '';
          let usedOpenAI = false;

          if (process.env.OPENAI_API_KEY) {
            try {
              const defContext = definitionsList ? `\nAvailable dictionary definitions for "${cleanWord}":\n${definitionsList}\n` : '';

              const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  response_format: { type: "json_object" },
                  messages: [
                    {
                      role: 'system',
                      content: `You are a TOEIC vocabulary expert. Output a JSON object with three keys: "selectedPartOfSpeech", "japanese", and "example".
Task:
1. Review the provided dictionary definitions for the word.
2. Select the ONE definition that is MOST frequently tested and relevant in the TOEIC exam (focusing on business, workplace, travel, and formal/professional contexts).
3. "selectedPartOfSpeech": Return the exact part of speech for the chosen definition.
4. "japanese": Translate the chosen TOEIC meaning into Japanese. CRITICAL RULE: If the selected part of speech is "verb", the translation MUST end with a verb form (e.g., "〜する"). Do not use noun forms for verbs.
5. "example": Write a short, natural English example sentence reflecting this specific TOEIC usage and matching the Japanese translation.`
                    },
                    { role: 'user', content: `Word: "${cleanWord}"${defContext}` }
                  ],
                  max_tokens: 150,
                  temperature: 0.7
                })
              });

              if (openaiResponse.ok) {
                const openaiData = await openaiResponse.json();
                const resultObj = JSON.parse(openaiData.choices[0].message.content);
                if (resultObj.selectedPartOfSpeech) partOfSpeech = resultObj.selectedPartOfSpeech;
                if (resultObj.japanese) japanese = resultObj.japanese;
                if (resultObj.example) {
                  rawExample = resultObj.example.trim().replace(/^["']|["']$/g, '');
                }
                usedOpenAI = true;
              }
            } catch (e) {
              console.error('OpenAI generation failed', e);
            }
          }

          // 3. OpenAIが失敗/未設定の場合のフォールバック
          if (!usedOpenAI) {
            let bestResult = resultsArray[0];
            if (bestResult) {
              partOfSpeech = bestResult.partOfSpeech || '';
              if (bestResult.examples && bestResult.examples.length > 0) {
                rawExample = bestResult.examples[0];
              }
              // DeepL Translation for fallback
              try {
                const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`
                  },
                  body: new URLSearchParams({
                    text: cleanWord,
                    source_lang: 'EN',
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

          if (rawExample) {
            // 1. まず完全一致で置換を試みる
            let regex = new RegExp(`\\b${cleanWord}\\b`, 'gi');
            paragraph = rawExample.replace(regex, '_');

            if (paragraph === rawExample) {
              // 2. 規則変化の活用形（複数形、過去形、進行形など）を許容する
              regex = new RegExp(`\\b${cleanWord}(s|es|ed|d|ing|er|est|ly)?\\b`, 'gi');
              paragraph = rawExample.replace(regex, '_[活用形]');
            }

            if (paragraph === rawExample && cleanWord.length >= 3) {
              // 3. 最後のフォールバック (不規則変化や子音の重なり run->running 等)
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
