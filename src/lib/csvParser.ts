import Papa from 'papaparse';
import { QuestionData } from '@/types';

export const parseCSV = (csvContent: string): Promise<QuestionData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const questions: QuestionData[] = results.data
            .filter((row: any) => {
              const w = row.words || row.word || '';
              return w.trim() !== '';
            })
            .map((row: any, index: number) => ({
              id: `q-${Date.now()}-${index}`,
              paragraph: row.paragraphs || row.paragraph || '',
              word: (row.words || row.word).trim(),
              japanese: row.japanese || '',
              phonetic: row.phonetic || '',
              partOfSpeech: row.partOfSpeech || row.part_of_speech || row.grammar || '',
            }));
            
          if (questions.length === 0) {
            throw new Error('有効な単語データが見つかりませんでした。CSVに「words」列が含まれているか確認してください。');
          }
          
          resolve(questions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
};
