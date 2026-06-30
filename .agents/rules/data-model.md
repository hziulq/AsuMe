# データモデルとCSVフォーマット

## 主要なデータ構造 (`src/types/index.ts`)
- **QuestionData**: 問題のベースデータ（`id`, `word`, `japanese`, `paragraph`, `phonetic`, `partOfSpeech`）。
  - 学習履歴として、`correctCount`, `incorrectCount`, `consecutiveCorrectCount`, `isMastered`, `lastStudiedAt` を追加で保持しています。
- **Project**: 単語帳の単位。
  - 複数の `QuestionData` を保持します。
  - ユーザーが間違えた問題のIDを保持する `wrongQuestionIds` を持ち、これを用いて「復習モード」を実現しています。

## CSVフォーマット仕様
アップロードされるCSVの1行目（ヘッダー）は、以下の列名を含んでいる必要があります。
- `paragraphs`: 穴埋め問題用のコンテキストとなる英文。空欄箇所はアンダースコア `_` または `_[活用形:元の活用語]` で表記します。
- `words`: 正解となる英単語
- `japanese`: その英単語の日本語訳
- `phonetic` (任意): 発音記号
- `partOfSpeech` (任意): 品詞や変形情報

## バリデーションと例外処理
- **CSVアップロード時のフィルタリング**: `words` 列が存在しない、または単語が空文字の行は自動的に除外されます。有効な単語が1つもない場合はエラーアラートを表示します。
- **日本語訳の未設定警告**: `japanese`（日本語訳）が空欄の単語が1つでも含まれる場合は、パース成功直後に「管理画面から一括補完を実行してください」と警告アラートを表示します。
