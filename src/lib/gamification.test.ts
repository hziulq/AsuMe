import { isEffectiveSuccess, summarizeSet } from '@/lib/gamification';
import { AttemptResult } from '@/types';

const r = (isCorrect: boolean, timedOut: boolean): AttemptResult => ({ isCorrect, timedOut });

describe('isEffectiveSuccess', () => {
  it('時間内の正解は成功', () => {
    expect(isEffectiveSuccess(r(true, false))).toBe(true);
  });
  it('時間切れの正解は失敗扱い', () => {
    expect(isEffectiveSuccess(r(true, true))).toBe(false);
  });
  it('誤答は失敗', () => {
    expect(isEffectiveSuccess(r(false, false))).toBe(false);
  });
  it('時間切れの誤答も失敗', () => {
    expect(isEffectiveSuccess(r(false, true))).toBe(false);
  });
});

describe('summarizeSet', () => {
  it('全問が実効成功なら isPerfect', () => {
    const s = summarizeSet({ a: r(true, false), b: r(true, false), c: r(true, false) });
    expect(s).toEqual({ total: 3, correctCount: 3, isPerfect: true });
  });

  it('時間切れ正解を含むとカウント外・非perfect', () => {
    const s = summarizeSet({ a: r(true, false), b: r(true, true) });
    expect(s.correctCount).toBe(1);
    expect(s.total).toBe(2);
    expect(s.isPerfect).toBe(false);
  });

  it('誤答を含むとカウント外・非perfect', () => {
    const s = summarizeSet({ a: r(true, false), b: r(false, false) });
    expect(s.correctCount).toBe(1);
    expect(s.isPerfect).toBe(false);
  });

  it('空マップは total=0 で非perfect', () => {
    expect(summarizeSet({})).toEqual({ total: 0, correctCount: 0, isPerfect: false });
  });

  it('時間切れ誤答のみは failure', () => {
    expect(summarizeSet({ a: r(false, true) })).toEqual({ total: 1, correctCount: 0, isPerfect: false });
  });
});
