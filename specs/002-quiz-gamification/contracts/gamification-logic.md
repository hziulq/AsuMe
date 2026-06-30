# Contract: `src/lib/gamification.ts`（ピュアロジック）

UI から分離してテスト可能にする判定・集計関数。副作用なし。憲章 原則II によりこれらは `gamification.test.ts` 先行で実装する。

## `isEffectiveSuccess(result: AttemptResult): boolean`

- **戻り値**: `result.isCorrect && !result.timedOut`。
- タイムアウト後の正解は `false`（失敗扱い）。

## `summarizeSet(results: Record<string, AttemptResult>): SetSummary`

- **入力**: 初回提示の結果マップ（`firstAttemptResults`）。
- **戻り値**: `{ total, correctCount, isPerfect }`。
  - `total` = エントリ数。
  - `correctCount` = `isEffectiveSuccess` が真の件数。
  - `isPerfect` = `total > 0 && correctCount === total`。

### テスト観点（gamification.test.ts）

| ケース | 入力 | 期待 |
|--------|------|------|
| 全問実効成功 | 3件すべて `{true,false}` | `correctCount=3, isPerfect=true` |
| 1問タイムアウト正解 | `{true,true}` を1件含む | その件は不成功、`isPerfect=false` |
| 誤答含む | `{false,false}` を含む | 正解数から除外、`isPerfect=false` |
| 空 | `{}` | `total=0, correctCount=0, isPerfect=false` |
| タイムアウト誤答 | `{false,true}` | 不成功 |

## （任意）`loadQuizPrefs() / saveQuizPrefs(prefs: QuizPrefs)`

- `asume_quiz_prefs` の read/write。未保存時は既定 `{ timedMode:false, questionSeconds:15 }`。
- localStorage 直アクセスのためロジック層に置くなら `typeof window` ガードを設ける（純関数ではない点に留意し、必要なら別モジュール化）。
