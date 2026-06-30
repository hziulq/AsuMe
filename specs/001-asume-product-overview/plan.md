# Implementation Plan: AsuMe 単語学習アプリ（プロダクト全体）

**Branch**: `001-asume-product-overview` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-asume-product-overview/spec.md`

> ⚠️ **本プランはリバース（as-built）ドキュメント**です。AsuMe は既に実装済みのため、本書は「これから作る計画」ではなく「現状の実装がどう spec を満たしているか」を構造化したものです。新規開発時は本書を基準ドキュメントとして差分を追記してください。

## Summary

ブラウザ `localStorage` だけで完結する TOEIC 向け英単語学習アプリ。CSV 取り込み／英単語からの自動生成で単語帳（Project）を作り、4択クイズ＋学習履歴ベースの出題最適化で「殿堂入り」を目指す。サーバーは Next.js の薄い API ルート2本（外部 AI/辞書 API のプロキシ兼整形）と、Edge での従量課金保護（Upstash レート制限）のみを担う。

## Technical Context

**Language/Version**: TypeScript 5 / React 19.2 / Next.js 16.2（App Router）

**Primary Dependencies**: `next@16.2.4`, `react@19.2`, `papaparse`(CSV), `jszip`(バックアップ), `cmu-pronouncing-dictionary`(発音フォールバック), `@upstash/ratelimit` + `@upstash/redis`(レート制限)。外部API: WordsAPI(RapidAPI) / OpenAI `gpt-4o-mini` / DeepL。

**Storage**: ブラウザ `localStorage`（キー `asume_projects`）が単一の永続化層。サーバーDBなし。Upstash Redis はレート制限カウンタ専用（学習データは保存しない）。

**Testing**: Jest + React Testing Library（jsdom）。既存ユニットテスト: `src/lib/csvParser.test.ts` / `projectManager.test.ts` / `quizEngine.test.ts`。

**Target Platform**: モダンブラウザ（クライアント中心）。デプロイ先は Vercel 等（`src/proxy.ts` が Edge で動作）。

**Project Type**: Web application（Next.js 単一プロジェクト。フロント中心＋API ルート2本）。

**Performance Goals**: クイズ操作は体感即時。自動生成は1単語ずつ逐次処理し進捗を可視化（タイムアウト回避）。

**Constraints**: 学習機能はオフライン動作可（データはローカル）。外部 API 利用は上限保護下（全体 2450回/日・IP 200回/日）。`any` 型禁止、React 19 Strict 純粋性順守。

**Scale/Scope**: 単一ユーザー・単一デバイスのローカルデータ。画面5（`/` ホーム, `/generator`, `/quiz/[projectId]`, `/manage/[projectId]`, レイアウト）、API ルート2（`/api/generate`, `/api/enrich`）、`src/lib` ユーティリティ約8本。

## Constitution Check

*GATE: Phase 0 前に通過必須。Phase 1 後に再確認。*

`.specify/memory/constitution.md` はテンプレート未記入（未批准）のため、強制ゲートは存在しない。代替として CLAUDE.md の事実上の原則を適用し、現状実装の適合を確認:

- **TDD**: ロジックは `*.test.ts` 先行 → 既存3テストで担保。**PASS**（新規ロジック追加時も継続）。
- **型安全（`any` 禁止）**: ESLint で `any` をエラー化。外部 `unknown` は型アサーション。**PASS**。
- **React 19 純粋性**: 直接ミューテーション禁止・`useEffect` 内同期 `setState` 禁止・派生は `useMemo`/変数。**PASS**。
- **ローカル完結 / プライバシー**: 学習データはサーバー送信しない。外部送信は生成時の「単語文字列」のみ。**PASS**。

→ 違反なし。Complexity Tracking 不要。

## Project Structure

### Documentation (this feature)

```text
specs/001-asume-product-overview/
├── plan.md              # 本ファイル
├── research.md          # Phase 0: as-built の技術判断と根拠
├── data-model.md        # Phase 1: エンティティと localStorage スキーマ
├── quickstart.md        # Phase 1: 起動・検証ガイド
├── contracts/           # Phase 1: API/CSV/ZIP の契約
│   ├── api-generate.md
│   ├── api-enrich.md
│   └── data-formats.md
└── tasks.md             # Phase 2: /speckit-tasks で生成（本コマンドでは未作成）
```

### Source Code (repository root)

```text
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # ルートレイアウト
│   ├── page.tsx              # ホーム（プロジェクト一覧・CSV取り込み・ZIP入出力）
│   ├── generator/page.tsx    # 英単語→単語データ自動生成 UI（1単語ずつ /api/generate 呼出・進捗）
│   ├── quiz/[projectId]/page.tsx     # 4択クイズ・結果・連続学習フッター
│   ├── manage/[projectId]/page.tsx   # 管理（成績・編集・削除・殿堂入りリセット・名称変更・一括補完）
│   ├── globals.css
│   └── api/
│       ├── generate/route.ts # POST: 単語配列→完全な単語データ配列（WordsAPI/OpenAI/DeepL/CMU）
│       └── enrich/route.ts   # POST: 単語+意味+品詞→例文(穴埋め済)+発音記号
├── components/
│   └── QuizCard.tsx          # 4択カード UI
├── lib/
│   ├── csvParser.ts (+test)  # CSV→QuestionData[]（バリデーション）
│   ├── csvExporter.ts        # Project→CSV（BOM付き）
│   ├── zipManager.ts         # ZIP バックアップ/復元
│   ├── projectManager.ts (+test) # localStorage CRUD・学習履歴更新・殿堂入り判定
│   ├── quizEngine.ts (+test) # 出題選定・4択ダミー生成・誤答再キュー
│   └── rateLimit.ts          # Upstash レート制限ロジック（定数 2450/200）
├── proxy.ts                  # Edge: API処理前のレート制限検査（Next.js 16 規約）
└── types/index.ts            # QuestionData / Project / QuestionType
```

**Structure Decision**: Next.js App Router の単一プロジェクト構成。ドメインロジックは UI から切り離して `src/lib`（テスト可能なピュア関数）に集約し、外部 API アクセスのみ `src/app/api/*` のサーバールートに隔離（APIキーをクライアントへ露出させない）。レート制限は `src/proxy.ts`（Edge）で API 到達前に検査。

## Complexity Tracking

> Constitution 違反なしのため記載不要。
