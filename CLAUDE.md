# CLAUDE.md

このリポジトリで作業するときの不変の前提。毎セッション自動で読まれる。
詳細な計画は [実装計画.md](実装計画.md) と [デプロイ・実機検証計画.md](デプロイ・実機検証計画.md)。

## プロダクト

筋トレアプリ「Dopagaki（ドパガキ）」。スマホ内カメラで筋トレ動作をリアルタイム認識し、
「どの動作を」「何回やったか」に応じてパチスロ風の派手な演出を出す。辛い筋トレをドーパミンで乗り切らせる。

## 確定事項（変更するときは必ずユーザーに確認）

- **Web アプリ（PWA）**。iOS / Android 両対応。ネイティブ化は将来検討。
- **バックエンドなし**。データは端末内のみ（IndexedDB / Dexie）。ログイン・同期・ランキングなし。
- **姿勢推定・rep 判定はすべてブラウザ内**（JS/TS + WASM）。サーバー推論しない。Python は実行時に使わない（開発時のオフライン分析のみ任意）。
- **対象種目は立位・正面の4種目に固定**: アームカール / ショルダープレス / スクワット / サイドレイズ。汎用性が見えたら追加を検討（Phase 4 後）。
- **自動カウント主体 + 手動タップfallback**。タップだけでも全機能が成立する設計。
- **リザルトの総挙上量 = Σ(重量 × 完了セット数)**。回数(reps)は乗じない。例: 10kg×3 + 20kg×3 = 90kg。
- **重量は kg 固定**。lb・チューブは対象外。
- **左右別カウントは扱わない**。両側同時 or 片側のみ。
- 演出アセットは当面は既製品（Lottie / スプライト / フリー効果音）を流用。後で差し替え。

## 技術スタック

- React + TypeScript + Vite / vite-plugin-pwa
- 姿勢推定: MediaPipe Tasks Vision `PoseLandmarker`（Web Worker + OffscreenCanvas）
- 演出: PixiJS v8 + Lottie / 音: Web Audio API（Howler.js）
- 永続化: Dexie（IndexedDB）
- 状態管理: 軽量ステートマシン（XState もしくは自前 reducer）
- ホスティング: Cloudflare Pages（or Vercel）。実機デバッグは Cloudflare Tunnel + `vite dev`

## 進め方のルール

- **1 セッション = 1 フェーズ**。またいで一気にやらない。
- 並列サブエージェントに渡す前に、型・インターフェース（`pose/types.ts` / `RepDetector` 基底 / effects の関数シグネチャ / Dexie スキーマ）を**コードで確定してコミット**する。
- 統合とレビューは必ず本体（親）で行う。
- detector は実機ではなく、記録した landmark 列のリプレイでテストする（`src/detectors/__tests__/`）。
- 演出まわりの変更は起動してスクリーンショットで確認する。
- フェーズ着手時は使い捨ての作業メモ（`docs/phase-N.md` など）を作り、変動はそこに書く。マスター計画は安定させる。

## コマンド（実装開始後に追記する）

- dev: `npm run dev`
- build: `npm run build`
- test: `npm test`
- typecheck: `npm run typecheck`
- 実機デバッグ: `cloudflared tunnel --url http://localhost:5173`
