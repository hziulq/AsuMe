# Phase 0 Research: ゲーミフィケーション統合の技術判断

製品要件は会話で確定済み（タイムアウト挙動・称賛演出）。ここでは既存実装への統合方針を決定する。NEEDS CLARIFICATION（技術）は無し。

## 1. タイムアウトの状態をどこで持ち、どう履歴へ流すか

- **Decision**: タイマー状態（残り秒・`expired`）は `quiz/[projectId]/page.tsx` が現在の問題ごとに保持。`QuizCard` の `onAnswer` を `(isCorrect: boolean, timedOut: boolean)` に拡張。`page.handleAnswer` で**実効成功 = `isCorrect && !timedOut`** を算出し、既存の履歴更新（`correctCount`/`incorrectCount`/`consecutiveCorrectCount`/`isMastered`/`wrongQuestionIds` と再キュー）に渡す。
- **Rationale**: 履歴更新は既に `handleAnswer` 内の初回判定（`firstAttemptResults[qId] === undefined`）に集約されている。実効成功を1か所で定義すれば、集計・履歴・再出題が自動的に整合する。
- **Alternatives considered**: タイムアウトを `QuizCard` 内だけで完結（履歴へ伝播できずNG）／別の履歴更新関数を新設（既存ロジック二重化でNG）。

## 2. タイマー満了で「自動スキップしない」実装

- **Decision**: 満了時は `expired=true` にして**カウントダウン表示を「時間切れ」に切替えるのみ**。選択肢ボタンは無効化しない（クリック可能のまま）。回答クリック時点の `expired` を `timedOut` として確定し、以後はタイマーを停止（選択フィードバックの1秒遅延中に状態が動かないよう固定）。
- **Rationale**: spec FR-002/FR-003 に厳密準拠。満了が回答可能性を奪わない。
- **Alternatives considered**: 満了で自動送信（要件違反）／満了でボタン無効化（学習者が解答できずNG）。

## 3. 「正解数／全問正解」の判定基準

- **Decision**: 既存の `firstAttemptResults`（初回提示の結果）を `Record<string, boolean>` から `Record<string, AttemptResult>`（`{ isCorrect, timedOut }`）に拡張。**正解数 = 実効成功（`isCorrect && !timedOut`）の件数**、**全問正解 = 全件が実効成功**。
- **Rationale**: 失敗問題はセット内で再出題され最終的に必ず正解になるため、初回基準でないとスコアが無意味になる（既存コードも初回基準で正答率を表示済み）。タイムアウトを失敗に含めることで spec と一致。
- **Alternatives considered**: 最終結果基準（常に全問正解になりNG）／UI正誤のみ（タイムアウトをスコアに反映できずNG）。

## 4. カウントアップ演出（毎回・約2秒）の実装方式

- **Decision**: 新規 `CountUpResult` を結果画面に差し込み、`useEffect` 内で `requestAnimationFrame`（または `setInterval`）により 0→正解数を約2秒で補間。完了後にコールバックで操作可能化。既存の「次の10問へ」固定フッターは演出終了後そのまま機能。
- **Rationale**: 追加依存なし。rAF は React 19 純粋性と相性が良く（effect 内の非同期更新）、クリーンアップで安全に停止可能。
- **Alternatives considered**: アニメーションライブラリ追加（依存増で不要）／CSS keyframes のみ（数値カウントの同期が難しい）。

## 5. 全問正解の特別演出

- **Decision**: `isPerfect` のときのみ `PerfectCelebration`（「全問正解おめでとう！」＋紙吹雪的なCSS演出）をカウントアップに重ねて表示。任意で既存 `playAudio` による音声称賛（既定オフでも可）。
- **Rationale**: 上振れ時の特別感。視覚＋テキストを基本にしアクセシビリティ（FR-012）も満たす。
- **Alternatives considered**: 常時特別演出（特別感が薄れる・spec違反）。

## 6. タイム制限モードの有効化と秒数（暫定）

- **Decision**: 学習開始画面（`!hasStarted` ブロック）に**オプトイントグル＋秒数（既定15秒）**を追加。セッション状態として保持し、任意で `asume_quiz_prefs`（localStorage）に最終選択を記憶。`Project` スキーマは変更しない。
- **Rationale**: 既存の無制限学習を壊さず、最小の設定で導入できる（製品判断は暫定だが設定値として外出しのため後変更が容易）。
- **Alternatives considered**: 常時オン（無制限学習を消すためリスク）／`Project` への保存（永続スキーマ変更を避けたい）。

## 7. React 19 純粋性の遵守ポイント

- タイマー/カウントアップは **effect 内**の `setInterval`/`rAF` で駆動し、必ずクリーンアップ。レンダー中・`useEffect` 同期実行での `setState` 連鎖を作らない。
- `currentQuestion` 変化時にタイマーを初期化（依存配列で制御）。状態は新オブジェクトで更新（直接ミューテーション禁止）。
