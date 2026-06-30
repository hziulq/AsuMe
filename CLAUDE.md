# 単語学習アプリ (AsuMe) - 開発ガイドライン

> 📄 **プロダクトの機能仕様（振る舞い・ユーザーストーリー・要件・成功基準）は `specs/001-asume-product-overview/spec.md` を正典とします。**
> 本ファイルは「開発規約」と「spec に載らない実装リファレンス(HOW)」に専念します。各機能の詳細な振る舞いは spec.md を参照してください。

## 実行・ビルド・テストのコマンド
本プロジェクトは **pnpm** に統一（`packageManager` で固定、ロックファイルは `pnpm-lock.yaml`）。`npm install` は混在の原因になるため使わないこと。
- 開発サーバー起動: `pnpm dev`
- ビルド: `pnpm build`
- テスト実行: `pnpm test` (Jest & React Testing Library を使用)
- 依存インストール: `pnpm install`

## アーキテクチャ（実装リファレンス）
- **フロントエンドのみ**: Next.js (App Router)。状態管理とデータ保存はすべてブラウザの `localStorage`（キー: `asume_projects`）で完結。サーバーサイドのロジックや外部DBは持たない。
- **データモデル (`src/types/index.ts`)**:
  - `QuestionData`: `id`, `word`(英単語), `japanese`(日本語訳), `paragraph`(穴埋め用英文), `phonetic`(発音記号), `partOfSpeech`(品詞), および学習履歴フィールド `correctCount` / `incorrectCount` / `consecutiveCorrectCount` / `isMastered` / `lastStudiedAt`
  - `Project`: 複数の `QuestionData` と、誤答ID配列 `wrongQuestionIds`(復習モード用)
- **主な画面/エンドポイント**: `/manage/[projectId]`(プロジェクト管理), `/api/enrich`(一部データの部分補完)

## 主要ライブラリ
- **Tailwind CSS v4**: テーマカラーはオレンジ・白・緑（「AsuMe」UI）。
- **PapaParse**: CSVパース (`src/lib/csvParser.ts`) と CSV書き出し (`src/lib/csvExporter.ts`)。Excelでの文字化けを防ぐためBOM付きで出力。
- **JSZip**: プロジェクトのデータと進捗をZIPでバックアップ/復元 (`src/lib/zipManager.ts`)。

## CSVフォーマット仕様（入出力契約）
取り込みCSVのヘッダーに必要な列（取り込み時バリデーションの振る舞いは spec 参照）:
- `paragraphs`: 穴埋め用の英文。空欄箇所はアンダースコア `_` で表記。
- `words`: 正解の英単語（必須）
- `japanese`: 日本語訳（必須）
- `phonetic`(任意): 発音記号
- `partOfSpeech`(任意): 品詞や変形情報

## コーディング規約・ルール
- **テスト駆動開発 (TDD)**: ロジックやユーティリティを追加・修正する際は、必ずJestを用いたテストファイル（`*.test.ts`）を作成・更新・パスさせてから実装してください。
- **クライアントコンポーネント**: `localStorage` や `window.speechSynthesis` に依存し、インタラクティブなUIが中心のため、PageやComponentの先頭には `"use client";` を宣言してください。
- **React 19 / Strict Mode 対応**: コンポーネントのピュア性を保つため、ステートの直接ミューテーション（`project.questions = ...`等）は絶対に避け、必ず新しいオブジェクトを作成して `setProject` で更新してください。また、`useEffect` 内での同期的な `setState` はレンダリング連鎖の警告を引き起こすため禁止です。データの初期化は `Promise.resolve().then()` を利用し、動的な計算結果は `useMemo` や通常の変数として派生させてください。
- **TypeScript と ESLint の厳格化**: 本プロジェクトでは `any` 型がエラーとして扱われます。外部ライブラリ（PapaParseなど）の `unknown` な戻り値は適切に型アサーションを行い、try-catch では `catch (e: unknown)` を使用して型安全に記述してください。

## 実装メモ（spec.md に載らない HOW の補足）
各機能の「何を・なぜ」は spec.md 参照。ここでは実装上の固有値・場所・形式のみ記録する。

### クイズエンジン
- 4択のダミー3つは同一プロジェクト内の他単語からランダム抽出。1セット最大10問。誤答は同セット内で正解までキュー末尾に再追加。（詳細は spec: User Story 1）

### CSV Generator / Enrich
- 使用API: **WordsAPI**(全定義リスト・品詞別発音オブジェクト) / **cmu-pronouncing-dictionary** npm(発音フォールバック・ARPAbet小文字化) / **OpenAI gpt-4o-mini**(JSONモードで意味選定・品詞整合の訳・例文を一括生成) / **DeepL**(OpenAI未設定または失敗時の翻訳フォールバック)。
- 発音記号マッチング: WordsAPIの発音オブジェクト × OpenAI判定品詞 `selectedPartOfSpeech` を照合し、record/project 等の名詞・動詞差を吸収。
- 一括生成はフロントから**1単語ずつ**呼び出し（サーバータイムアウト回避・進捗バー/プレビュー表示）。
- 穴埋めの活用形置換: 原形一致は `_`、活用形は内部データとして `_[活用形:attempted]` 形式で保存（画面表示では正解を隠し、TTSでは英語として正しく発音させるため）。

### 学習履歴・出題アルゴリズム
- 3回連続正解で `isMastered: true`（殿堂入り）→ 通常学習の出題から除外。全単語を最低1回解くと1周。未回答・低正答率を優先出題。復習ボタンは直近誤答の特訓用。

### レート制限
- 実装: `src/proxy.ts`(Next.js 16以降の規約) + `src/lib/rateLimit.ts`（Edge環境、Upstash Redis）。API処理前に検査。
- 定数: `DAILY_GLOBAL_LIMIT` = 2450回/日（WordsAPI無料枠保護）, `DAILY_IP_LIMIT` = 200回/日。`429` 受信時、一括補完(Batch Enrich)等のループは即時安全中断し上限到達メッセージを表示。

### 例外処理の実装上の要点
- CSV取り込み: `words` 無し/空文字の行は除外。有効単語0件はエラー。`japanese` 空欄を含む場合は一括補完を促す警告。
- クイズ1セット終了直後の再レンダリングで存在しない問題インデックスを参照した場合は、安全に `null` を返して結果画面へ遷移（配列外参照対策）。

### ゲーミフィケーション（タイマー・称賛演出）
仕様は [specs/002-quiz-gamification](specs/002-quiz-gamification/spec.md)。
- **実効成功 = `正解 && !時間切れ`**（`src/lib/gamification.ts` の `isEffectiveSuccess`）。時間切れ後の正解は失敗扱い（連続正解リセット・`wrongQuestionIds` 追加・セット内再キュー）。集計 `summarizeSet` と `page.tsx` の履歴更新の双方でこの定義を一貫適用。
- タイマーは `QuizCard`（`timedMode`/`questionSeconds`、`onAnswer(isCorrect, timedOut)`）。残り0でも**自動スキップせず**ボタンは無効化しない。`expired = timedMode && secondsLeft<=0` を派生で算出。
- `firstAttemptResults` は `Record<string, AttemptResult{isCorrect,timedOut}>`（初回提示のみ評価）。「正解数／全問正解」は初回基準。
- 結果演出: `CountUpResult`（毎回・約2秒・rAF＋reduced-motion対応）と `PerfectCelebration`（`isPerfect` 時のみ）。演出完了まで結果フッターをゲート。
- 設定: `asume_quiz_prefs`（`QuizPrefs`）に直近のタイム制限設定を保存。`Project`/`QuestionData` スキーマは不変。

## [重要] AIツール利用時の注意事項
- **テンプレートリテラルのエスケープ厳禁**: ファイルの書き込み・置換（`write_to_file` 等）をAIに行わせる際、TypeScriptのテンプレートリテラル内のバッククォート( \` ) や ドル記号 ( \$ ) を**絶対にバックスラッシュ（ \ ）でエスケープしないでください**。ファイル内にそのままバックスラッシュが記述され、Next.jsのSyntax Errorの直接的な原因になります。
- **ターミナル実行時の考慮**: ユーザー環境はWindows (PowerShell) のため、実行ポリシーの影響を受ける場合があります。
