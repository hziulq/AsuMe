import Papa from 'papaparse';
import { Project } from '@/types';

export const exportProjectToCSV = (project: Project) => {
  const data = project.questions.map(q => ({
    words: q.word,
    japanese: q.japanese,
    paragraphs: q.paragraph,
    phonetic: q.phonetic,
    partOfSpeech: q.partOfSpeech
  }));

  const csv = Papa.unparse(data, {
    header: true
  });

  // Excel等で文字化けしないようにBOM(Byte Order Mark)を付与してBlobを作成
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${project.name}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
