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

## 4. 現在の開発目標 (Current Goal: CSV Generator)
- **機能概要**: 英単語のみを入力し、その他の情報（例文、品詞、発音記号、日本語訳）を自動生成する機能の実装。
- **使用API/ライブラリ**:
  - `WordsAPI`: 英単語の意味、例文、品詞、（および必要に応じ発音記号）の取得。
  - `CMU Pronouncing Dictionary`: 発音記号の取得（WordsAPIのIPAで代替可能な場合は併せて検討）。
  - `翻訳API (DeepL または Google)`: WordsAPIの英語の定義を日本語に翻訳。
- **特記事項**: 例文内の対象単語を自動で `_` に置換するロジックを組み込むこと。
<!-- END:project-rules -->
