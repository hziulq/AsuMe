---
description: "Task list for クイズのゲーミフィケーション（解答タイマー＋称賛演出）"
---

# Tasks: クイズのゲーミフィケーション（解答タイマー＋称賛演出）

**Input**: Design documents from `specs/002-quiz-gamification/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: 憲章 原則II（Test-First, NON-NEGOTIABLE）により、`src/lib/gamification.ts` のロジックはテスト必須。UI（コンポーネント表示）のテストは任意とする。

**Organization**: タスクはユーザーストーリー単位（US1〜US3）で構成し、各ストーリーを独立して実装・検証できるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（別ファイル・未完了タスクへの依存なし）
- **[Story]**: US1 / US2 / US3（spec.md のユーザーストーリーに対応）

## Path Conventions

Next.js 単一プロジェクト。リポジトリルートの `src/` を使用。

---

## Phase 1: Setup

- [x] T001 変更前のベースラインを確認（`npm run test` と `npm run build` がグリーンであることを確認）。リポジトリルートで実行。

---

## Phase 2: Foundational（全ストーリーの前提・ブロッキング）

**Purpose**: 集計ロジックと型を先に固める。US1〜US3 はすべてここに依存する。

- [x] T002 `src/types/index.ts` に `AttemptResult`（`{ isCorrect: boolean; timedOut: boolean }`）, `SetSummary`（`{ total: number; correctCount: number; isPerfect: boolean }`）, `QuizPrefs`（`{ timedMode: boolean; questionSeconds: number }`）を追加（`QuestionData`/`Project` は変更しない）。
- [x] T003 [P] `src/lib/gamification.test.ts` に失敗するユニットテストを作成。`contracts/gamification-logic.md` のテスト表（全問成功 / タイムアウト正解 / 誤答含む / 空 / タイムアウト誤答）を網羅し、`isEffectiveSuccess` と `summarizeSet` を検証。
- [x] T004 `src/lib/gamification.ts` を実装し T003 を通す：`isEffectiveSuccess(r)` = `r.isCorrect && !r.timedOut`、`summarizeSet(results)` で `SetSummary` を導出（`isPerfect = total>0 && correctCount===total`）。任意で `loadQuizPrefs()`/`saveQuizPrefs()`（`asume_quiz_prefs`・`typeof window` ガード）。

**Checkpoint**: ロジックのテストが全グリーン。以降の集計・履歴判定はこの実効成功定義に一本化する。

---

## Phase 3: User Story 1 - 解答タイマーとタイムアウトの扱い (Priority: P1) 🎯 MVP

**Goal**: タイム制限モード時に1問ごとのカウントダウンを表示し、時間切れでも自動スキップせず解答可能にし、時間切れ回答は正解でも失敗として記録・UIで明示する。

**Independent Test**: タイム制限オンで (a) 時間内正解 / (b) 時間切れ後に正解 / (c) 時間切れ後に誤答 を行い、結果表示と学習履歴（連続正解・復習キュー・再出題）への反映が spec どおりになることを確認。

- [x] T005 [P] [US1] `src/components/QuizCard.tsx` を拡張：props に `timedMode: boolean` と `questionSeconds: number` を追加、`onAnswer` を `(isCorrect: boolean, timedOut: boolean) => void` に変更。`timedMode` 時はカウントダウンを表示し、残り0で「⏱ 時間切れ」状態に切替える（**選択肢ボタンは無効化しない**）。選択クリック時の `expired` を `timedOut` として確定しタイマー停止、既存1秒フィードバック後に `onAnswer(isCorrect, timedOut)`。回答後は「時間内正解／時間切れだが正解／不正解（時間切れ）」を区別表示。
- [x] T006 [US1] `src/app/quiz/[projectId]/page.tsx` の学習開始画面（`!hasStarted` ブロック）に「タイム制限モード」トグル（既定オフ）と秒数選択（既定15秒）を追加し、セッション状態として保持。
- [x] T007 [US1] `src/app/quiz/[projectId]/page.tsx` の出題・回答処理を更新：`firstAttemptResults` を `Record<string, boolean>` → `Record<string, AttemptResult>` に変更し、`handleAnswer` を `(isCorrect, timedOut)` 化。初回判定内で **実効成功＝`isCorrect && !timedOut`** を用いて既存の履歴更新（`correctCount`/`incorrectCount`/`consecutiveCorrectCount`/`isMastered`/`wrongQuestionIds`）と再キューを行う（実効失敗は不正解と同じ経路）。`QuizCard` へ `timedMode`/`questionSeconds` を渡す。
- [x] T008 [P] [US1] （任意）`src/app/quiz/[projectId]/page.tsx` で `loadQuizPrefs`/`saveQuizPrefs` を用い、直近のタイム制限設定を記憶・初期表示に反映。

**Checkpoint**: タイム制限モードで自動スキップが起きず、時間切れ正解が連続正解数を増やさないことを実機確認できる（US1 単独で価値が成立）。

---

## Phase 4: User Story 2 - セット完了時の正解数カウントアップ演出 (Priority: P1)

**Goal**: セット完了時、毎回、正解数（実効成功）を高揚感のある演出で約2秒かけてカウントアップ表示する。

**Independent Test**: 任意成績でセットを完了し、カウントアップ演出が表示され約2秒で終了、終了後すぐ次アクションが操作可能になることを確認。

- [x] T009 [P] [US2] `src/components/CountUpResult.tsx` を新規作成：props `{ correctCount, total, durationMs=2000, onDone }`。`useEffect` 内の `requestAnimationFrame`（または `setInterval`）で 0→`correctCount` を補間（クリーンアップ必須）、終了時に `onDone`。「ドキドキする」加速演出を付与。
- [x] T010 [US2] `src/app/quiz/[projectId]/page.tsx` の結果画面（`isFinished` ブロック）で `summarizeSet(firstAttemptResults)` から `SetSummary` を導出し、`CountUpResult` をマウント表示。既存の「正解率/N正解」表示と各単語行の ○/× を**実効成功**基準に統一し、タイムアウト失敗には「×（時間切れ）」を併記。演出完了（`onDone`）まで次アクションの誤操作を防ぎ、完了後は既存フッターをそのまま機能させる。

**Checkpoint**: 全プレイでカウントアップが表示され約2秒で終了、継続フローが滞らない。

---

## Phase 5: User Story 3 - 全問正解時の特別な称賛演出 (Priority: P2)

**Goal**: セットを全問正解（全件 実効成功）したときのみ、特別な称賛演出を追加表示する。

**Independent Test**: 全問正解セットと、1問でも失敗があるセットを完了し、特別演出の有無が切り替わることを確認。

- [x] T011 [P] [US3] `src/components/PerfectCelebration.tsx` を新規作成：props `{ show: boolean; withVoice?: boolean }`。`show` 時のみ「全問正解おめでとう！」＋祝祭演出（視覚＋テキスト）を表示。`withVoice` 時は既存 `src/lib/audio.ts` の `playAudio` で音声称賛（既定オフ）。
- [x] T012 [US3] `src/app/quiz/[projectId]/page.tsx` の結果画面で `SetSummary.isPerfect` のときのみ `PerfectCelebration` をカウントアップに重ねて表示。

**Checkpoint**: 全問正解時のみ特別演出が出る（誤表示なし）。

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T013 [P] アクセシビリティ：`CountUpResult` と `PerfectCelebration` で結果をテキストでも提示し、`prefers-reduced-motion` を尊重（FR-012）。
- [x] T014 [P] `CLAUDE.md` の「実装メモ」に本機能を追記（タイム制限／時間切れ＝失敗扱い／カウントアップ・全問正解演出／実効成功の定義）。
- [x] T015 品質ゲート：`npm run lint`（`any` なし）・`npm run test`・`npm run build` を実行し、すべてグリーンにする。
- [ ] T016 `quickstart.md` の V1〜V4 を手動検証（自動スキップ0% / 時間切れ正解の失敗記録 / 約2秒カウントアップ / 全問正解時のみ特別演出 / 無制限モード非退行）。

---

## Dependencies & Execution Order

- **Setup（T001）** → **Foundational（T002→T003→T004）** → 各ユーザーストーリー → **Polish**
- **Foundational がすべてのストーリーをブロック**（型と集計ロジックが前提）。
- **US1（T005-T008）**: `AttemptResult` と `isEffectiveSuccess` に依存。T005 は別ファイルで並列可、T006/T007 は同一 `page.tsx` のため順次。T007 は T005 の `onAnswer` シグネチャ変更に依存。
- **US2（T009-T010）**: Foundational の `summarizeSet` と、US1（T007）の `firstAttemptResults`→`AttemptResult` 化に依存。T009（コンポーネント）は早期に並列着手可。
- **US3（T011-T012）**: Foundational の `isPerfect` と US2（T010 の結果画面統合）に依存。T011（コンポーネント）は並列着手可。
- 同一ファイル（`page.tsx`）を編集する T006/T007/T010/T012 は相互に順次実行。

## Parallel Opportunities

- Foundational 内: **T003（テスト）** は T002 完了後すぐ着手可（`[P]`）。
- コンポーネント新規作成は相互に並列可: **T005 / T009 / T011** は別ファイルのため並列着手できる（各ストーリーの page.tsx 統合タスクより先行可能）。
- Polish: **T013 / T014** は並列可。

### 並列実行例

```
# Foundational 完了後、UIコンポーネントを並列で先行実装:
T005 (QuizCard 拡張)  ┐
T009 (CountUpResult)  ├─ 別ファイルのため並列可
T011 (PerfectCelebration) ┘
# その後、page.tsx への統合は順次: T006 → T007 → T010 → T012
```

## Implementation Strategy

- **MVP（P1）**: US1 + US2（タイマー＋タイムアウト明示＋セット完了カウントアップ）。spec で両者 P1。ここまでで「ゲーミフィケーションが動く」状態。
- **増分**: US3（全問正解の特別演出・P2）を上乗せ。
- 各ストーリー完了時にチェックポイントで独立検証 → 次へ。憲章 原則IV に従い、タイマー／演出は effect 内の非同期更新＋クリーンアップで実装し、レンダー中の同期 setState を作らない。
