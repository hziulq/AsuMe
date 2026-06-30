# Contract: `POST /api/generate`

英単語の配列から、完全な単語データ（訳・例文・発音・品詞）の配列を生成する。出典: `src/app/api/generate/route.ts`。

## Request

- **Method**: `POST`
- **Body** (`application/json`):

```json
{ "words": ["ambiguity", "negotiate"] }
```

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `words` | string[] | ✓ | 生成対象の英単語。各要素は trim + 小文字化され、空要素はスキップ |

## Response

### 200 OK

```json
{
  "results": [
    {
      "word": "negotiate",
      "paragraph": "We will _ the contract terms tomorrow.",
      "japanese": "交渉する",
      "phonetic": "nɪˈɡoʊʃiˌeɪt",
      "partOfSpeech": "verb"
    }
  ]
}
```

各要素: `word` / `paragraph`（穴埋め済・活用形は `_[活用形:元語]`）/ `japanese` / `phonetic` / `partOfSpeech`。
※ `id` などは付与されずクライアント側で QuestionData 化する。

### エラー

| Status | 条件 | Body |
|--------|------|------|
| 400 | `words` が無い/配列でない | `{ "error": "Invalid words array" }` |
| 500 | `WORDS_API_KEY` または `DEEPL_API_KEY` 未設定 | `{ "error": "APIキーが設定されていません。…" }` |
| 500 | サーバー例外 | `{ "error": "サーバーエラーが発生しました" }` |
| 429 | レート上限（`proxy.ts` で API 到達前に遮断） | レート制限実装に準拠 |

## 生成パイプライン（1単語あたり）

1. **WordsAPI** で定義リスト（最大10）と発音オブジェクト取得。
2. **OpenAI gpt-4o-mini**（JSONモード）で TOEIC 最頻出の意味を選定 → `selectedPartOfSpeech` / `japanese`（動詞は「〜する」形式）/ `example`。
3. OpenAI 未設定/失敗 → WordsAPI 先頭定義 + **DeepL** 翻訳に縮退。
4. 例文の対象語を `_` 置換（原形 → 規則活用 `_[活用形:$1]` → 接頭辞ヒューリスティックの3段）。
5. 発音記号: 品詞一致 > `all` > 任意、無ければ **CMU辞書**（ARPAbet小文字）。

## 外部依存（環境変数）

`WORDS_API_KEY`, `DEEPL_API_KEY`（必須）, `OPENAI_API_KEY`（任意・推奨）。
