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

// --- ゲーミフィケーション（一時状態・永続スキーマには含めない） ---

// 1問の初回提示時の結果。実効成功 = isCorrect && !timedOut
export interface AttemptResult {
  isCorrect: boolean;
  timedOut: boolean;
}

// 1セット完了時のサマリ（firstAttemptResults から派生）
export interface SetSummary {
  total: number;
  correctCount: number;
  isPerfect: boolean;
}

// タイム制限モードのUI設定（学習データとは別キーに保存）
export interface QuizPrefs {
  timedMode: boolean;
  questionSeconds: number;
}
