# Phase 2: 姿勢推定の導入（MediaPipe を Web Worker で）

> GitHub Issue: [#4](https://github.com/tetsurounagao/Dopagaki-training/issues/4)
> PR は "Closes #N" を含める。

## ゴール

前面カメラの映像から MediaPipe `PoseLandmarker` でリアルタイムに 33 点ランドマークを取り、実行画面にスケルトンを重畳できる状態にする。推論は Web Worker + OffscreenCanvas で本スレッドから分離。**この段階ではまだ rep 自動判定はしない**（Phase 3）。ランドマークが安定して取れて、演出と共存できることを確認するのが目的。

参照: [実装計画.md](../../実装計画.md) §8 Phase 2 ／ [デプロイ・実機検証計画.md](../../デプロイ・実機検証計画.md) §3.2・§9.1・§9.2・§10

## スコープ（成果物）

### 1. モデルの自ホスト
- `@mediapipe/tasks-vision` を npm 追加。`.task` モデルファイルと wasm を `public/models/` に配置（CDN 参照しない → CLAUDE.md / デプロイ計画 §6）。
- Vite が wasm を正しく配信できるよう設定（必要なら `vite.config.ts`）。

### 2. `src/pose/` — 推論パイプライン
- `poseWorker.ts`: Web Worker。`PoseLandmarker`（VIDEO モード）を初期化し、受け取ったフレーム（`ImageBitmap` / `VideoFrame`）を `detectForVideo` にかけて 33 点を postMessage で返す。OffscreenCanvas 使用。
- `PoseClient.ts`: メインスレッド側の型付きラッパ。`<video>` から `requestVideoFrameCallback`（or rAF）でフレームを取り、Worker に転送（transferable）。結果を購読するコールバック I/F。ミラー（x 反転）を `pose/types.ts` 側の規約に合わせて正規化。
- `pose/types.ts`（既存）に必要な型を追加（`PoseClientOptions`, worker メッセージ型など）。ランドマークのインデックス定数は既存の `POSE` を使用。

### 3. `src/camera/useCamera.ts`
- `getUserMedia({ video: { facingMode: 'user' } })`。権限状態（prompt / granted / denied）、デバイス切断、`<video>` への stream 割り当て、クリーンアップ。
- 権限拒否時は既存の手動モード導線に合流（ステートマシンはカメラ工程をスキップ）。

### 4. 実行画面への組み込み
- `exerciseSetup` / `setActive` でカメラプレビュー（ミラー）を表示。
- スケルトン重畳（Canvas 2D か Pixi）をデバッグトグルで ON/OFF。
- 演出（`effects/`）と同時描画してもフレームが破綻しないこと。

### 5. デバッグ HUD（[デプロイ計画 §10](../../デプロイ・実機検証計画.md)）
- 有効化: クエリ `?debug=1` または画面隅トリプルタップ。
- 表示: 表示 fps / 推論 fps / 推論 ms / ランドマーク最小 visibility / detector phase（Phase 3 で埋まる）/ rep カウント / confidence / ドロップフレーム数。
- ビデオ上スケルトン重畳の ON/OFF。
- 「セッション記録」: ランドマーク列＋タイムスタンプ＋イベントを 1 JSON でダウンロード（**ネットワーク送信なし**）。Phase 3 のフィクスチャ収集に使う。

### 6. スロットリング / ライフサイクル
- 派手な演出中（フィーバー等）は推論 fps を落とす。
- Page Visibility API でバックグラウンド時に推論停止、復帰で再開。
- 推論解像度を下げる調整の余地を残す（設定可能な定数）。

## 先に確定してコミットする I/F

- `pose/types.ts` の worker メッセージ型・`PoseClient` の購読 I/F
- `useCamera` の戻り値の形（`{ videoRef, status, error, start, stop }` 程度）

## サブエージェント

- **調査**（1 体、Explore or general-purpose）: 「2026 時点の MediaPipe Tasks Vision で PoseLandmarker を Web Worker + OffscreenCanvas で動かす最新手順」「モデル/wasm の自ホスト方法とファイル取得元」「Vite 8 での wasm 配信設定」を調べて結論とコード断片だけ回収。実装は本体（中核・直列）。
- HUD コンポーネントは切り出して 1 体に回してもよい。

## 受け入れ条件

- [ ] カメラ許可 → 前面カメラのミラープレビューが出る
- [ ] スケルトンが重畳表示される（デバッグトグル）
- [ ] 推論が Web Worker で動く（本スレッドのフレームを止めない）
- [ ] `?debug=1` で HUD が出て fps / 推論ms / visibility が見える
- [ ] 「セッション記録」で JSON がダウンロードできる
- [ ] バックグラウンド遷移で推論停止、復帰で再開
- [ ] カメラ権限拒否 → 手動モードで従来どおり完走できる（後退なし）
- [ ] `typecheck` / `lint` / `format:check` / `test` / `build` が green
- [ ] **（実機・ユーザー）** iOS Safari / Android Chrome で 15fps 以上を維持しつつ演出が破綻しない — Cloudflare Tunnel + `vite dev` で計測（[デプロイ計画 §9.1・§9.2](../../デプロイ・実機検証計画.md)）

## スコープ外（Phase 3 以降）

- rep の自動判定（`RepDetector`、角度計算、ヒステリシス）
- キャリブレーション中身
- 種目ごとの認識ロジック
- 自動 rep → 演出発火の結線（`useWorkout` の `dispatch({type:'REP'})` に流すだけの口は用意しておく）

## メモ

- `useWorkout` の REP は現状 `tapRep` のみ。Phase 3 で自動 rep も同じ `dispatch({type:'REP'})` に合流させる。
- この環境（CI/開発ホスト）ではカメラも GPU も無いため、推論そのものの動作確認は実機頼み。ここではビルド・型・メッセージプロトコルのテストまで。
