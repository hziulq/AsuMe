import { NextResponse } from 'next/server';
import { dictionary as cmudict } from 'cmu-pronouncing-dictionary';

export async function POST(request: Request) {
  try {
    const { word, japanese, partOfSpeech } = await request.json();
    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const cleanWord = word.trim().toLowerCase();
    let phonetic = '';
    let pronunciationObj: Record<string, string> | null = null;
    let paragraph = '';

    const WORDS_API_KEY = process.env.WORDS_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    // 1. Fetch Pronunciation from WordsAPI
    if (WORDS_API_KEY) {
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
          if (data.pronunciation) {
            if (typeof data.pronunciation === 'string') {
              pronunciationObj = { all: data.pronunciation };
            } else {
              pronunciationObj = data.pronunciation;
            }
          }
        }
      } catch (e) {
        console.error('WordsAPI failed in enrich', e);
      }
    }

    // 2. Fetch Example Sentence from OpenAI
    try {
      const prompt = `You are a TOEIC vocabulary expert. 
Word: "${cleanWord}"
Meaning (Japanese): "${japanese || 'unknown'}"
Part of Speech: "${partOfSpeech || 'unknown'}"

Task: Write a single, short, natural English example sentence that demonstrates this word used in the exact meaning and part of speech provided. The sentence should be suitable for a TOEIC business/formal context.
Output a JSON object with exactly one key "example" containing the sentence.`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: prompt }
          ],
          max_tokens: 100,
          temperature: 0.7
        })
      });

      if (openaiResponse.ok) {
        const openaiData = await openaiResponse.json();
        const resultObj = JSON.parse(openaiData.choices[0].message.content);
        if (resultObj.example) {
          const rawExample = resultObj.example.trim().replace(/^["']|["']$/g, '');

          // Apply blank replacement logic
          let regex = new RegExp(`\\b${cleanWord}\\b`, 'gi');
          paragraph = rawExample.replace(regex, '_');

          if (paragraph === rawExample) {
            regex = new RegExp(`\\b(${cleanWord}(?:s|es|ed|d|ing|er|est|ly)?)\\b`, 'gi');
            paragraph = rawExample.replace(regex, '_[活用形:$1]');
          }

          if (paragraph === rawExample && cleanWord.length >= 3) {
            const prefixLength = cleanWord.length >= 5 ? 4 : 3;
            const prefix = cleanWord.slice(0, prefixLength);
            const wordsInExample = rawExample.match(/\b[a-zA-Z]+\b/g) || [];

            const targetMatch = wordsInExample.find((w: string) =>
              w.toLowerCase().startsWith(prefix) &&
              Math.abs(w.length - cleanWord.length) <= 4
            );

            if (targetMatch) {
              const fallbackRegex = new RegExp(`\\b(${targetMatch})\\b`, 'gi');
              paragraph = rawExample.replace(fallbackRegex, '_[活用形:$1]');
            }
          }
        }
      }
    } catch (e) {
      console.error('OpenAI generation failed in enrich', e);
    }

    if (!paragraph) {
      paragraph = `An example for _.`;
    }

    // 3. Determine Final Phonetic
    if (pronunciationObj) {
      // Find matching part of speech
      const posMatch = partOfSpeech ? Object.keys(pronunciationObj).find(k =>
        partOfSpeech.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(partOfSpeech.toLowerCase())
      ) : null;

      if (posMatch) {
        phonetic = pronunciationObj[posMatch];
      } else if (pronunciationObj.all) {
        phonetic = pronunciationObj.all;
      } else {
        phonetic = Object.values(pronunciationObj).find(v => typeof v === 'string') as string || '';
      }
    }
    if (!phonetic) {
      phonetic = cmudict[cleanWord] || '';
    }
    if (phonetic && phonetic === cmudict[cleanWord]) {
      phonetic = phonetic.toLowerCase();
    }

    return NextResponse.json({ phonetic, paragraph });
  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
