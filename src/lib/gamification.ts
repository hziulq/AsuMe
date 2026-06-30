import { AttemptResult, SetSummary, QuizPrefs } from '@/types';

// 実効成功: 正解 かつ 時間切れでない。時間切れ後の正解は失敗扱い。
export function isEffectiveSuccess(result: AttemptResult): boolean {
  return result.isCorrect && !result.timedOut;
}

// 初回提示の結果マップからセットサマリを導出する。
export function summarizeSet(results: Record<string, AttemptResult>): SetSummary {
  const entries = Object.values(results);
  const total = entries.length;
  const correctCount = entries.filter(isEffectiveSuccess).length;
  return {
    total,
    correctCount,
    isPerfect: total > 0 && correctCount === total,
  };
}

const PREFS_KEY = 'asume_quiz_prefs';
const DEFAULT_PREFS: QuizPrefs = { timedMode: false, questionSeconds: 15 };

export function loadQuizPrefs(): QuizPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<QuizPrefs>;
    return {
      timedMode: typeof parsed.timedMode === 'boolean' ? parsed.timedMode : DEFAULT_PREFS.timedMode,
      questionSeconds:
        typeof parsed.questionSeconds === 'number' ? parsed.questionSeconds : DEFAULT_PREFS.questionSeconds,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveQuizPrefs(prefs: QuizPrefs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
