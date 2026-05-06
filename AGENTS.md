<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->
# 単語学習アプリ (AsuMe) プロジェクトルールと仕様

今後の開発や機能追加を行うAIエージェントに向けた、本プロジェクト特有の仕様と注意事項です。

## 1. アーキテクチャと技術スタック
- **フレームワーク**: Next.js (App Router)。サーバーサイドレンダリングよりも、主にクライアントサイド (`"use client"`) で動作するロジックが中心です。
- **スタイリング**: Tailwind CSS v4。全体的にポップで明るい「AsuMe（オレンジ、白、緑）」のデザインテーマを採用しています。
- **データ管理**: サーバーやDBを持たず、**ブラウザの `localStorage` （キー名: `asume_projects`）**にすべてのデータを永続化する完全なローカルアプリです。
- **主要ライブラリ**: 
  - `papaparse`: CSVからの問題データインポート。
  - `jszip`: プロジェクトデータと進捗状況をZIPとしてバックアップ出力・復元する機能。
- **テスト (TDD)**: Jestを用いた単体テスト（`src/lib/*.test.ts`）を作成・維持してください。

## 2. 主要なデータ構造 (`src/types/index.ts`)
- **QuestionData**: 問題のベースデータ（`id`, `word`, `japanese`, `paragraph`, `phonetic`, `partOfSpeech`）。
- **Project**: 単語帳の単位。複数の `QuestionData` と共に、ユーザーが間違えた問題のIDを保持する `wrongQuestionIds` を持ちます。この配列を用いて「復習モード」を実現しています。
- **QuizEngine**: 4択問題のうち、正解以外の「ダミー選択肢3つ」は、同じプロジェクト内（CSV内）の他の単語からランダムに抽出する仕様です。

## 3. 開発時・ツール利用時の重要注意事項（Agent Guidelines）
- **テンプレートリテラルのエスケープ問題**: ファイル書き込みツール（`write_to_file` 等）を使用する際、テンプレート文字列内のバッククォート( \` ) や ドル記号 ( \$ ) の前に**絶対にバックスラッシュ（ \ ）をつけてエスケープしないでください。** エスケープするとファイル内にそのまま `\` が書き込まれ、Next.jsのコンパイルエラー（Syntax Error）の直接的な原因になります。
- **ターミナル環境**: ユーザー環境はWindows (PowerShell) です。実行ポリシーの制限等により `npx` コマンドなどが失敗した経緯があるため、コマンド実行時は環境に配慮してください。
- **React Strict Mode (React 19) への準拠**: `useEffect` 内での同期的な `setState` 呼び出しは「cascading renders」警告の対象となるため厳禁です。初回データロード時は `Promise.resolve().then(...)` を用いて非同期化するか、計算結果などの派生状態には `useState` ではなく `useMemo` を活用してください。また、`project` のような状態オブジェクトを直接ミューテーション（書き換え）せず、必ずスプレッド構文等でディープコピーして更新してください。
- **TypeScript と ESLint**: プロジェクトは `any` 型の使用をエラーとする厳格な Lint ルールが適用されています。PapaParse の `results.data` のように `unknown[]` を返すデータは、引数で型指定するのではなく事前に `(results.data as Record<string, string>[])` のように配列自体を型アサーションして自然な推論を効かせてください。エラーハンドリング時は `catch (e: unknown)` を使用し、`e instanceof Error` で判定を行ってください。

## 4. 現在の開発目標 (Current Goal: CSV Generator & UX Enhancement)
- **機能概要**: 英単語のみを入力し、その他の情報（例文、品詞、発音記号、日本語訳）を自動生成する機能の実装、および学習UXの向上。
- **プロジェクト管理の拡充**: 管理画面でのプロジェクト名変更機能や、クイズ結果画面からの直接問題編集（インライン編集）を実装し、ユーザー体験を向上。
- **シームレスな連続学習**: クイズ10問終了後の結果画面に、未習得の単語が残っている場合はスクロール不要の固定フッターで「次の10問へ」進めるボタンを配置し、学習のテンポを最適化。
- **TOEIC特化の文脈判断**: WordsAPIから得た複数の意味リストをOpenAIに渡し、TOEIC（ビジネス、オフィス、旅行、フォーマル）で最も頻出する意味と品詞を推論させます。これにより、`book` が「本」ではなく「予約する」として出力されるなど、実践的な学習データが作られます。
- **品詞に基づく翻訳の厳格化**: 動詞なら「〜する」といった形で、品詞と日本語訳の形式が確実に一致するように、OpenAIのJSONモードを利用してプロンプト制約をかけています。
- **品詞に基づく発音記号の最適化**: WordsAPIから取得した発音記号オブジェクトと、OpenAIが推論した品詞をマッチングさせ、名詞・動詞で発音が変わる単語（例: record）にも正確な発音記号を設定します。
- **使用API/ライブラリ**:
  - `WordsAPI`: 英単語の意味リスト、品詞、および発音記号オブジェクト（品詞別の発音）の取得。
  - `CMU Pronouncing Dictionary`: 発音記号の取得（WordsAPIで取得できなかった場合のフォールバック）。
  - `OpenAI API (gpt-4o-mini)`: 意味の選定、日本語訳、例文の生成（JSONモードで一括処理）。
  - `翻訳API (DeepL)`: OpenAIのAPIキー未設定、または生成失敗時のフォールバック。
- **特記事項**: 例文内の対象単語を自動で `_` に置換するロジックを組み込むこと。
<!-- END:project-rules -->
