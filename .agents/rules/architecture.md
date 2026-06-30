# アーキテクチャと技術スタック
- **フレームワーク**: Next.js (App Router)。サーバーサイドのロジックやDBは持たず、主にクライアントサイド (`"use client"`) で動作するロジックが中心です。
- **データ管理**: ブラウザの `localStorage` (`asume_projects` キー) にすべてのデータを永続化する完全なローカルアプリ。
- **スタイリング**: Tailwind CSS v4。親しみやすい「AsuMe（オレンジ、白、緑）」のデザインテーマを採用。
- **主要ライブラリ**: 
  - `papaparse`: CSVからの問題データインポート、BOM付きCSVエクスポート用。
  - `jszip`: プロジェクトデータと進捗状況をZIPとしてバックアップ出力・復元用。
- **APIレート制限**: `@upstash/redis` と `@upstash/ratelimit` を用いた Middleware により、外部API（WordsAPI等）へのリクエスト回数を厳密に制限。
  - グローバル上限: 1日2450回
  - IP別上限: 1日200回
