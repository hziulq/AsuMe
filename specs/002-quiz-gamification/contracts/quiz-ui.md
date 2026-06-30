# Contract: クイズUIの拡張（QuizCard / 結果画面 / 演出）

新規HTTPエンドポイントは無い。本機能の「インターフェース」はコンポーネント契約。

## QuizCard（変更）

現行 props:
```
{ question, choices, mode, onAnswer: (isCorrect: boolean) => void }
```

変更後 props（追加分）:
| prop | 型 | 説明 |
|------|----|------|
| `timedMode` | boolean | タイム制限モードか |
| `questionSeconds` | number | 制限秒数（`timedMode` 時） |
| `onAnswer` | `(isCorrect: boolean, timedOut: boolean) => void` | **シグネチャ変更**。回答確定時の `expired` を `timedOut` で渡す |

挙動契約:
- `timedMode` 時、カードにカウントダウン（残り秒）を表示。
- 残り0で `expired` 表示（例: 「⏱ 時間切れ」）に切替えるが**ボタンは無効化しない**。
- 選択クリック時に `timedOut = expired` を確定し、以後タイマー停止。既存の1秒色フィードバック後に `onAnswer(isCorrect, timedOut)`。
- 回答後フィードバックで「時間内正解／時間切れだが正解／不正解（時間切れ）」を区別表示。
- 無制限モード時は従来挙動（`timedOut` 常に false）。

## 結果画面（`quiz/[projectId]/page.tsx` の `isFinished` ブロック・変更）

- `firstAttemptResults`（`Record<string, AttemptResult>`）から `summarizeSet` で `SetSummary` を導出。
- 既存の「正解率 X% / N正解」は `correctCount`（実効成功）基準に統一。
- 各単語行の ○/× は**実効成功**で判定。タイムアウト由来の失敗は「×（時間切れ）」を併記。
- マウント時に `CountUpResult` を表示。

## CountUpResult（新規・プレゼンテーショナル）

| prop | 型 | 説明 |
|------|----|------|
| `correctCount` | number | 最終到達値 |
| `total` | number | 分母表示用 |
| `durationMs` | number | 既定 2000。終了までの時間 |
| `onDone` | `() => void` | 完了通知（操作可能化に利用） |

- 0→`correctCount` を `durationMs` で補間（effect 内 rAF/interval、クリーンアップ必須）。
- 「ドキドキする」高揚演出（加速・効果音的な視覚強調）。終了後 `onDone`。

## PerfectCelebration（新規・プレゼンテーショナル）

| prop | 型 | 説明 |
|------|----|------|
| `show` | boolean | `SetSummary.isPerfect` のとき true |
| （任意）`withVoice` | boolean | 既存 `playAudio` による称賛（既定 false） |

- `show` 時のみ「全問正解おめでとう！」＋祝祭演出を重畳表示。視覚＋テキストで伝達（FR-012）。

## 学習開始画面（`!hasStarted` ブロック・変更）

- 「タイム制限モード」トグル（既定オフ）と秒数選択（既定15秒）を追加。
- 選択を `QuizPrefs` として保持（任意で `asume_quiz_prefs` に保存）。
