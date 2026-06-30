# Phase 1 Data Model: AsuMe

出典: `src/types/index.ts` および `src/lib/projectManager.ts` の実装。永続化はブラウザ `localStorage`。

## 永続化スキーマ

- **キー**: `asume_projects`（`localStorage`）
- **値**: `Project[]` を JSON 文字列化したもの。
- レート制限カウンタのみ Upstash Redis に存在（学習データではない）。

## エンティティ

### QuestionType（クイズ出題モード）

```
'en_to_ja' | 'ja_to_en' | 'fill_in_the_blank'
```

英→日 / 日→英 / 穴埋めの3モードを表す列挙。

### QuestionData（単語）

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `id` | string | ✓ | 単語の一意ID |
| `paragraph` | string | ✓ | 穴埋め用英文。空欄は `_`、活用形は `_[活用形:元語]` |
| `word` | string | ✓ | 正解の英単語 |
| `japanese` | string | ✓ | 日本語訳（品詞整合形式。動詞は「〜する」等） |
| `phonetic` | string | ✓ | 発音記号（IPA または ARPAbet 小文字） |
| `partOfSpeech` | string | – | 品詞（`selectedPartOfSpeech` 由来） |
| `correctCount` | number | – | 累計正答数 |
| `incorrectCount` | number | – | 累計誤答数 |
| `consecutiveCorrectCount` | number | – | 連続正解数（3で殿堂入り） |
| `isMastered` | boolean | – | 殿堂入りフラグ（通常出題から除外） |
| `lastStudiedAt` | number | – | 最終学習時刻（epoch ms） |

**バリデーション（取り込み時 / `csvParser.ts`）**: `word` 空/欠落の行は除外。有効0件はエラー。`japanese` 空欄を含む場合は一括補完を促す警告。

**状態遷移（学習履歴 / `projectManager.ts`）**:
- 正解 → `correctCount++`, `consecutiveCorrectCount++`, `lastStudiedAt` 更新。`consecutiveCorrectCount >= 3` で `isMastered = true`。
- 誤答 → `incorrectCount++`, `consecutiveCorrectCount = 0`、所属 Project の `wrongQuestionIds` に追加。
- 殿堂入りリセット（管理画面）→ `isMastered = false`, `consecutiveCorrectCount = 0`。

### Project（単語帳）

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `id` | string | ✓ | プロジェクト一意ID |
| `name` | string | ✓ | 単語帳名（管理画面でインライン変更可） |
| `questions` | QuestionData[] | ✓ | 所属する単語群 |
| `wrongQuestionIds` | string[] | – | 直近誤答ID（復習モード用） |
| `createdAt` | number | ✓ | 作成時刻（epoch ms） |
| `lastStudiedAt` | number | – | 最終学習時刻（epoch ms） |

**関係**: `Project 1 — N QuestionData`（埋め込み）。`wrongQuestionIds` は同一 Project 内 `questions[].id` への参照集合。

## 派生・一時データ（非永続）

- **学習セット（Quiz Set）**: `quizEngine.ts` が殿堂入りを除外し未回答・低正答率を優先して最大10問を選定。誤答はセット内で正解までキュー末尾へ再追加（メモリ上のキュー、永続化しない）。
- **4択選択肢**: 正解＋同一 Project 内の他単語からランダム抽出したダミー3つ（実行時生成）。
