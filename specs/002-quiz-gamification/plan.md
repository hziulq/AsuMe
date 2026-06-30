# Implementation Plan: クイズのゲーミフィケーション（解答タイマー＋称賛演出）

**Branch**: `002-quiz-gamification` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-quiz-gamification/spec.md`

## Summary

既存の4択クイズ（`/quiz/[projectId]`）に、(1) タイム制限モード時の1問ごとカウントダウンと「時間切れ＝失敗扱い（自動スキップせず明示）」、(2) セット完了時の正解数カウントアップ演出（毎回・約2秒）と全問正解時の特別称賛、を追加する。判定ロジックは `src/lib` のピュア関数に切り出して Jest テストで担保し、UI は既存コンポーネント（`QuizCard`・結果画面）に最小拡張で載せる。新たな外部通信・永続スキーマ変更は行わない。

## Technical Context

**Language/Version**: TypeScript 5 / React 19.2 / Next.js 16.2（App Router、`"use client"`）

**Primary Dependencies**: 追加ライブラリなし。タイマーは標準 `setInterval`/`requestAnimationFrame`、称賛演出は CSS/Tailwind トランジション、音声（任意）は既存 `src/lib/audio.ts`（`window.speechSynthesis`）を再利用。

**Storage**: 学習履歴は既存どおり `localStorage`（`asume_projects`）。タイマー設定（オン/オフ・秒数）は任意でUI設定キー（例 `asume_quiz_prefs`）に保存可。**`Project`/`QuestionData` の永続スキーマは変更しない**。

**Testing**: Jest + RTL。新規ピュアロジックに `*.test.ts` を追加（憲章 原則II）。

**Target Platform**: モダンブラウザ（クライアント完結）。

**Project Type**: Web application（既存 Next.js 単一プロジェクトへの機能追加）。

**Performance Goals**: カウントダウン更新と演出は体感なめらか。カウントアップ演出は約2.0秒（±0.5秒）で終了。

**Constraints**: 追加の外部送信なし（ローカル完結）。`any` 禁止。React 19 純粋性（タイマー/アニメは effect 内の非同期コールバックで実装、レンダー中の同期 setState 禁止、クリーンアップ必須）。

**Scale/Scope**: 影響範囲は `src/app/quiz/[projectId]/page.tsx`、`src/components/QuizCard.tsx`、新規 `src/lib/gamification.ts`（+テスト）、新規演出コンポーネント1〜2点。画面追加なし。

**未確定（製品判断・暫定値で進行可）**: タイム制限モードの有効化＝学習開始画面オプトイン（既定オフ）／1問の制限時間＝既定15秒。いずれも設計をブロックしない（設定値として外出し）。

## Constitution Check

*GATE: Phase 0 前に通過必須。Phase 1 後に再確認。* 出典 `.specify/memory/constitution.md` v1.0.0。

- **I. Local-First & Privacy**: 追加の外部送信なし。タイマー・集計・演出はすべてローカル。**PASS**。
- **II. Test-First（NON-NEGOTIABLE）**: 実効成功判定・セット集計などの新規ロジックは `src/lib/gamification.ts` に切り出し、`gamification.test.ts` を先行作成。**PASS（gate）**。
- **III. Strict Type Safety**: 新規型（`AttemptResult` 等）を定義し `any` 不使用。**PASS**。
- **IV. React 19 Render Purity**: タイマーは `useEffect`＋`setInterval`（クリーンアップ）、カウントアップは effect 内 rAF/interval。レンダー中の同期 setState を作らない。状態は新オブジェクトで更新。**PASS（実装時順守）**。
- **V. API コスト保護**: 外部 API 不使用のため非該当。**PASS**。

→ 違反なし。Complexity Tracking 不要。

## Project Structure

### Documentation (this feature)

```text
specs/002-quiz-gamification/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── gamification-logic.md   # src/lib ピュア関数の契約
│   └── quiz-ui.md              # QuizCard / 結果画面 の UI 契約
└── tasks.md                    # /speckit-tasks で生成（本コマンドでは未作成）
```

### Source Code (repository root) — 変更・追加対象

```text
src/
├── app/quiz/[projectId]/page.tsx   # [変更] タイマー状態・timedOut 伝播・handleAnswer 拡張・結果画面に演出差し込み・開始画面にタイム制限トグル
├── components/
│   ├── QuizCard.tsx                # [変更] カウントダウン表示、onAnswer(isCorrect, timedOut)、時間切れUI状態
│   ├── CountUpResult.tsx           # [新規] 正解数カウントアップ演出（約2秒）
│   └── PerfectCelebration.tsx      # [新規] 全問正解の特別称賛演出
├── lib/
│   ├── gamification.ts             # [新規] 実効成功判定・セット結果集計（ピュア関数）
│   └── gamification.test.ts        # [新規] 上記のユニットテスト
└── types/index.ts                  # [変更] AttemptResult 等の付加型（QuestionData/Project は不変）
```

**Structure Decision**: 既存構成を踏襲。ゲーミフィケーションの「判定・集計」は UI から分離して `src/lib/gamification.ts` のピュア関数に集約しテスト可能化（原則II/IV）。タイマー・演出の見た目は既存 `QuizCard` と結果画面、および新規プレゼンテーショナルコンポーネントに閉じる。`firstAttemptResults` を「正誤のみ」から「正誤＋タイムアウト」に拡張し、実効成功＝`正解 && !タイムアウト` を集計と履歴更新の双方に一貫適用する。

## Complexity Tracking

> Constitution 違反なしのため記載不要。
