# Phase 0 Research: AsuMe（as-built の技術判断）

リバース・ドキュメントのため「未解決の NEEDS CLARIFICATION」は存在しない。ここでは実装済みアーキテクチャの主要な技術判断を、根拠と検討された代替案とともに記録する。

## 1. 永続化を localStorage に一本化

- **Decision**: 全学習データ（Project/QuestionData/進捗）をブラウザ `localStorage`（キー `asume_projects`）に保存。サーバーDB・アカウントを持たない。
- **Rationale**: 個人学習用途で即時オフライン動作・ゼロ運用コスト・プライバシー（学習履歴を外部に出さない）を優先。ログイン不要で摩擦が低い。
- **Alternatives considered**: サーバーDB+認証（運用コスト・プライバシー負荷大）／IndexedDB（容量は大きいが本アプリのデータ量では過剰、同期APIで十分）。
- **Trade-off**: デバイス紛失・ブラウザデータ消去で消える → ZIP バックアップ/復元（FR-024）で補完。複数端末同期は手動 ZIP 移行（範囲外）。

## 2. 単語データ自動生成を「サーバールート経由・1単語ずつ」

- **Decision**: `/api/generate` `/api/enrich` をサーバールートに置き、フロントから**1単語ずつ**呼ぶ。
- **Rationale**: (a) APIキー（WordsAPI/OpenAI/DeepL）をクライアントに露出させない、(b) 大量一括生成でのサーバータイムアウトを回避し、(c) 1件ごとに進捗バー・プレビューを更新できる（UX）。
- **Alternatives considered**: クライアント直叩き（キー露出でNG）／サーバーで全件一括処理（タイムアウト・進捗不可）。

## 3. 意味選定の中核に OpenAI gpt-4o-mini（JSONモード）

- **Decision**: WordsAPI の定義リスト（最大10件）を gpt-4o-mini に渡し、TOEIC で最頻出の意味・品詞・訳・例文を JSON で一括生成。
- **Rationale**: 多義語（book=予約する 等）を文脈で最適化。JSONモードで `selectedPartOfSpeech`/`japanese`/`example` を構造化取得し、品詞と訳形式（動詞→「〜する」）の整合をプロンプト制約で担保。
- **Alternatives considered**: WordsAPI 定義の機械的先頭採用（多義語で不適切）／翻訳のみ（例文・品詞整合が取れない）。
- **Fallback**: OpenAI 未設定/失敗時は WordsAPI 先頭定義＋DeepL 翻訳に縮退。

## 4. 発音記号の品詞別マッチングと多段フォールバック

- **Decision**: WordsAPI の `pronunciation`（文字列 or 品詞別オブジェクト）と判定品詞を照合 → 一致品詞 > `all` > 任意文字列、の順で採用。取れなければ `cmu-pronouncing-dictionary`（ARPAbet・小文字化）。
- **Rationale**: record/project 等の名詞・動詞で発音が変わる語に正しい発音を割当。無料辞書フォールバックで欠損を最小化。
- **Alternatives considered**: 単一発音固定（多義語で誤読）／外部 TTS の自動推定（不安定）。

## 5. 穴埋めの活用形置換（3段ロジック）

- **Decision**: 例文中の対象語を `_` に置換。原形完全一致が無ければ規則活用（`s|es|ed|d|ing|er|est|ly`）を `_[活用形:$1]` に置換。なお一致しなければ接頭辞ヒューリスティック（先頭3-4文字一致＋語長差≤4）で不規則変化を捕捉。
- **Rationale**: 表示は正解を隠し（`_[活用形]`）、TTS は元語（attempted 等）で自然に発音、を両立。
- **Alternatives considered**: 原形一致のみ（活用形を隠せない）／全単語ステミング（過剰置換リスク）。

## 6. 従量課金 API の上限保護（Edge レート制限）

- **Decision**: `src/proxy.ts`（Next.js 16 規約・Edge）で API 到達前に Upstash Redis ベースのレート制限を検査。グローバル `DAILY_GLOBAL_LIMIT=2450`/日、`DAILY_IP_LIMIT=200`/日。
- **Rationale**: 公開環境で WordsAPI 無料枠を絶対防衛し、想定外ループ・悪意アクセスの過剰課金を防ぐ。`429` でフロントのループ（Batch Enrich 等）を安全中断。
- **Alternatives considered**: アプリ内メモリカウンタ（サーバーレス/マルチインスタンスで不正確）／制限なし（課金事故リスク）。

## 7. ドメインロジックの分離とテスト戦略

- **Decision**: 出題・採点・CRUD・履歴更新を `src/lib` のピュア関数に集約し Jest でユニットテスト（csvParser/projectManager/quizEngine）。UI は薄く保つ。
- **Rationale**: localStorage/`window` 依存を UI 層に寄せ、ロジックを純粋化してテスト容易性と React 19 純粋性を確保。
- **Alternatives considered**: コンポーネント内ロジック混在（テスト困難・再レンダリング副作用）。

## Open Items / 既知の留意点

- 外部 API キー（`WORDS_API_KEY`, `DEEPL_API_KEY`, `OPENAI_API_KEY`）は `.env.local` 前提。未設定時の縮退挙動は各ルートで実装済み。
- Upstash 環境変数未設定時のレート制限挙動は `rateLimit.ts` の実装に従う（デプロイ時要確認）。
