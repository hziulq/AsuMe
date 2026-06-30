# Phase 1 Data Model: ゲーミフィケーション

本機能は**永続スキーマ（`Project`/`QuestionData`）を変更しない**。追加は主にセッション内の一時状態と、任意のUI設定。

## 既存への影響（不変）

- `QuestionData` の履歴フィールド（`correctCount`/`incorrectCount`/`consecutiveCorrectCount`/`isMastered`/`lastStudiedAt`）と `Project.wrongQuestionIds` は**そのまま**利用。
- タイムアウトは「実効失敗」として既存の履歴更新経路に流れる（新フィールド不要）。

## 新規型（`src/types/index.ts` に追加）

### AttemptResult（初回提示の結果・一時）

```
interface AttemptResult {
  isCorrect: boolean;   // 選んだ選択肢が正解か（UI正誤）
  timedOut: boolean;    // タイム制限切れ後の回答か
}
```

- **実効成功（effective success）** = `isCorrect && !timedOut`。集計・履歴更新の双方でこの定義を一貫適用。
- `quiz` ページの `firstAttemptResults` を `Record<string, boolean>` → `Record<string, AttemptResult>` に拡張。

### SetSummary（セット結果サマリ・一時／派生）

```
interface SetSummary {
  total: number;        // 出題された問題数（初回提示の件数）
  correctCount: number; // 実効成功の件数
  isPerfect: boolean;   // total > 0 かつ 全件が実効成功
}
```

- `src/lib/gamification.ts` の純関数で `Record<string, AttemptResult>` から導出。永続化しない。

## タイマー状態（コンポーネント内・一時）

| 状態 | 型 | 説明 |
|------|----|------|
| `secondsLeft` | number | 残り秒（カウントダウン表示用） |
| `expired` | boolean | 制限時間に到達したか（到達後も解答可能） |
| `paused` | boolean | 選択確定後にタイマーを固定 |

問題切替（`currentQuestion` 変化）でリセット。永続化しない。

## 任意のUI設定（`asume_quiz_prefs`／localStorage・学習データとは別）

```
interface QuizPrefs {
  timedMode: boolean;       // 既定 false（オプトイン）
  questionSeconds: number;  // 既定 15
}
```

- 学習履歴ではなく「直近の選択を覚える」用途。未保存でも既定値で動作。`Project` には保存しない。

## 状態遷移（1問あたり、タイム制限モード時）

```
出題 → カウントダウン進行
  ├─ 残り>0 で正解選択      → 実効成功（履歴: 正解/連続+1、殿堂入り判定）
  ├─ 残り>0 で誤答選択      → 実効失敗（履歴: 不正解/連続0、wrongQuestionIds追加、再キュー）
  └─ 残り=0（expired）後に選択
        ├─ 正解選択         → UI「正解（時間切れ）」表示・実効失敗として記録・再キュー
        └─ 誤答選択         → UI「不正解（時間切れ）」表示・実効失敗として記録・再キュー
```

無制限モードでは `expired` は発生せず、従来どおりの正誤判定のみ。
