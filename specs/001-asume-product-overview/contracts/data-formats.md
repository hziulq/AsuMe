# Contract: データ入出力フォーマット（CSV / ZIP / localStorage）

ユーザー・外部ファイルとの境界となる非HTTP契約。出典: `src/lib/csvParser.ts` / `csvExporter.ts` / `zipManager.ts` / `projectManager.ts`。

## 1. CSV 取り込みフォーマット

PapaParse でヘッダー付き CSV をパース（`csvParser.ts`）。

| 列名 | 必須 | 説明 |
|------|------|------|
| `paragraphs` | – | 穴埋め用英文。空欄は `_`（活用形は `_[活用形:元語]`） |
| `words` | ✓ | 正解の英単語 |
| `japanese` | ✓ | 日本語訳 |
| `phonetic` | – | 発音記号 |
| `partOfSpeech` | – | 品詞・変形情報 |

**バリデーション**:
- `words` 欠落/空文字の行は自動除外。
- 有効な単語が0件 → エラー表示（取り込み中止）。
- `japanese` 空欄を含む → 取り込みは成功させ、「管理画面から一括補完を」警告を表示。

## 2. CSV 書き出しフォーマット

`csvExporter.ts` が Project の単語データを CSV 化。
- **BOM 付き UTF-8** で出力（Excel での日本語文字化け防止）。
- 列は取り込みフォーマットと互換（往復可能）。

## 3. ZIP バックアップ/復元フォーマット

`zipManager.ts`（JSZip）。
- **エクスポート**: Project データ＋学習進捗を含む ZIP を生成（バックアップ）。
- **インポート**: ZIP から Project と進捗を復元し `localStorage` に反映。
- 進捗（`correctCount` 等の学習履歴）を含むため、CSV（単語のみ）より完全な保全手段。

## 4. localStorage スキーマ

- **キー**: `asume_projects`
- **値**: `Project[]` の JSON 文字列。
- 読み書きは `projectManager.ts` 経由（直接ミューテーション禁止・新オブジェクトで更新）。
- 詳細な型は [data-model.md](../data-model.md) を参照。

## 5. クライアント↔サーバー境界

自動生成系のみサーバールート（`/api/generate`, `/api/enrich`）を経由。学習データそのものはサーバーへ送信せず、外部に出るのは生成対象の「単語文字列（＋意味・品詞）」のみ。
