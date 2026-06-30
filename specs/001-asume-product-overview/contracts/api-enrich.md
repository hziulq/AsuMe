# Contract: `POST /api/enrich`

1単語について「例文（穴埋め済）」と「発音記号」のみを部分補完する。手動追加/個別修正/一括補完(Batch Enrich)から利用。出典: `src/app/api/enrich/route.ts`。

## Request

- **Method**: `POST`
- **Body** (`application/json`):

```json
{ "word": "record", "japanese": "記録する", "partOfSpeech": "verb" }
```

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `word` | string | ✓ | 対象英単語（trim + 小文字化） |
| `japanese` | string | – | 文脈（意味）。例文を意味に合わせるヒント |
| `partOfSpeech` | string | – | 品詞。発音記号の品詞別マッチングと例文制約に使用 |

## Response

### 200 OK

```json
{ "phonetic": "rɪˈkɔːrd", "paragraph": "Please _ the meeting minutes." }
```

| フィールド | 型 | 説明 |
|-----------|----|------|
| `phonetic` | string | 発音記号（品詞一致 > `all` > 任意 > CMU辞書フォールバック） |
| `paragraph` | string | 穴埋め済み例文（活用形は `_[活用形:元語]`） |

### エラー

| Status | 条件 | Body |
|--------|------|------|
| 400 | `word` 欠落 | `{ "error": "Word is required" }` |
| 500 | `OPENAI_API_KEY` 未設定 | `{ "error": "OPENAI_API_KEY is not configured" }` |
| 500 | サーバー例外 | `{ "error": "サーバーエラーが発生しました" }` |
| 429 | レート上限（`proxy.ts`） | レート制限実装に準拠 |

## 補完パイプライン

1. `WORDS_API_KEY` があれば WordsAPI で発音オブジェクト取得（任意）。
2. **OpenAI gpt-4o-mini**（JSONモード）で、与えられた意味・品詞に厳密一致する TOEIC 文脈の例文1文を生成。
3. 例文を `_` / `_[活用形:$1]` 置換（generate と同一の3段ロジック）。
4. 発音記号を最終決定（品詞別マッチング → CMU フォールバック）。
5. 例文が空なら `An example for _.` を既定値とする。

## generate との差分

- 入力は **1単語＋意味＋品詞**、出力は **例文と発音記号のみ**（訳・品詞は補完しない）。
- `OPENAI_API_KEY` が**必須**（generate は任意で DeepL 縮退あり）。
