# コーディング規約・ルール

- **テスト駆動開発 (TDD)**: ロジックやユーティリティを追加・修正する際は、必ずJestを用いたテストファイル（`src/lib/*.test.ts`）を作成・更新・パスさせてから実装してください。
- **クライアントコンポーネント**: `localStorage` や `window.speechSynthesis` に依存し、インタラクティブなUIが中心のため、PageやComponentの先頭には `"use client";` を宣言してください。
- **React 19 / Strict Mode 対応**:
  - `useEffect` 内での同期的な `setState` 呼び出しは「cascading renders」警告の対象となるため厳禁です。
  - 初回データロード時は `Promise.resolve().then(...)` を用いて非同期化してください。
  - 動的な計算結果などの派生状態には `useState` ではなく `useMemo` を活用してください。
  - `project` のような状態オブジェクトを直接ミューテーション（書き換え）せず、必ず新しいオブジェクトを作成（スプレッド構文など）して更新してください。
- **TypeScript と ESLint の厳格化**:
  - `any` 型の使用をエラーとする厳格な Lint ルールが適用されています。
  - PapaParse の `results.data` のように `unknown[]` を返すデータは、適切に型アサーションを行ってください（例: `(results.data as Record<string, string>[])`）。
  - エラーハンドリング（`try-catch`）時は `catch (e: unknown)` を使用し、`e instanceof Error` で判定を行ってください。

## [重要] AIエージェント（ツール利用時）の注意事項
- **テンプレートリテラルのエスケープ問題**: ファイル書き込みツール（`write_to_file` 等）を使用する際、テンプレート文字列内のバッククォート( \` ) や ドル記号 ( \$ ) の前に**絶対にバックスラッシュ（ \ ）をつけてエスケープしないでください。** エスケープするとファイル内にそのまま `\` が書き込まれ、Next.jsのコンパイルエラー（Syntax Error）の直接的な原因になります。
- **ターミナル環境**: ユーザー環境はWindows (PowerShell) です。実行ポリシーの制限等に配慮してコマンドを実行してください。
