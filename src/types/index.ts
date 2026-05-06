export type QuestionType = 'en_to_ja' | 'ja_to_en' | 'fill_in_the_blank';

export interface QuestionData {
  id: string;
  paragraph: string;
  word: string;
  japanese: string;
  phonetic: string;
  partOfSpeech?: string;
  correctCount?: number;
  incorrectCount?: number;
  consecutiveCorrectCount?: number;
  isMastered?: boolean;
  lastStudiedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  questions: QuestionData[];
  wrongQuestionIds?: string[];
  createdAt: number;
  lastStudiedAt?: number;
}
