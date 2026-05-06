import { QuestionData, QuestionType } from '@/types';

export interface QuizChoice {
  id: string;
  text: string;
  isCorrect: boolean;
}

// Fisher-Yates shuffleアルゴリズム
export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function generateQuizOptions(
  correctQuestion: QuestionData,
  allQuestions: QuestionData[],
  mode: QuestionType,
  numOptions: number = 4
): QuizChoice[] {
  // モードに応じて表示するテキスト（英語か日本語か）を決定
  const getOptionText = (q: QuestionData) => {
    switch (mode) {
      case 'en_to_ja':
        return q.japanese;
      case 'ja_to_en':
      case 'fill_in_the_blank':
      default:
        return q.word;
    }
  };

  const correctChoice: QuizChoice = {
    id: correctQuestion.id,
    text: getOptionText(correctQuestion),
    isCorrect: true,
  };

  // 正解データ自身と、偶然同じテキストを持つデータ、または空欄のデータを除外
  const availableDummies = allQuestions.filter(
    q => q.id !== correctQuestion.id && getOptionText(q) !== correctChoice.text && getOptionText(q) !== ''
  );

  const shuffledDummies = shuffle(availableDummies);
  
  // 必要な数だけダミーを抽出（通常は numOptions - 1 = 3個）
  const selectedDummies = shuffledDummies.slice(0, numOptions - 1).map(q => ({
    id: q.id,
    text: getOptionText(q),
    isCorrect: false,
  }));

  // 正解とダミーを結合して、再度シャッフル
  const allChoices = [correctChoice, ...selectedDummies];
  return shuffle(allChoices);
}
