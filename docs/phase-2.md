# Phase 2 作業メモ（使い捨て）

Issue: [#4](https://github.com/tetsurounagao/Dopagaki-training/issues/4) ／ PR: #5
スコープ詳細は [issues/phase-2.md](issues/phase-2.md)。

## 完了

- **調査（サブエージェント）**: `@mediapipe/tasks-vision@1.0.1`、wasm 6ファイル、lite モデル URL、`worker.format:'es'`、COOP/COEP 不要、in-flight バックプレッシャ、`bitmap.close()` 必須、`createImageBitmap` resize でスループット改善 — を確認
- **モデル/wasm 自ホスト**: `scripts/sync-mediapipe.mjs`（wasm コピー + モデル DL、非fatal）、`public/models/` gitignore
- **pose/**: `poseWorker.ts`（実装）/ `PoseClient.ts`（フレーム供給・間引き・fps・ミラー）/ `drawSkeleton.ts` / `types.ts`（I/F）
- **camera/useCamera.ts**: getUserMedia + 権限/切断
- **features/workout/**: `useVision`（ライフサイクル・省電力・Visibility）/ `CameraLayer`（映像+スケルトン）/ `useDebug` + `DebugHud`（?debug=1・記録）
- **WorkoutScreen**: z 順レイヤー、HUD 結線、タップで `logEvent('rep')`
- **vite.config**: `worker.format:'es'`、`globIgnores:['**/models/**']`

## 検証（ローカル + CI）

typecheck / lint / format:check / test(41) / build すべて green。PR #5 CI green。
worker チャンクに mediapipe がバンドル、`dist/models/` に wasm+モデル出力を確認。

## 実機未確認（ブロック中）

- **fps ≥ 15 / 発熱 / GPU delegate 可否 / iOS Safari のカメラ / standalone PWA** — すべて実機必須
- 前提: **Cloudflare Pages（or Vercel）連携がまだ**。または `cloudflared tunnel --url http://localhost:5173`（`vite.config.ts` の `server.allowedHosts`/`hmr` をコメント解除）
- objectFit:cover のクロップぶんスケルトンが数 % ずれる（Phase 3 で精密化 or 許容）

## 申し送り（Phase 3）

- `useVision().onFrame(cb)` に RepDetector を繋ぐ。rep 検出 → `dispatch({type:'REP'})`（`tapRep` と同じ経路）。
- HUD の `phase` / `confidence` 欄は Phase 3 の detector 状態で埋める。
- セッション記録の JSON（`pose-session-*.json`）が Phase 3 フィクスチャの元になる（[デプロイ計画 §9.3.1](../デプロイ・実機検証計画.md)）。
- `src/pose/__tests__/` は未作成。Phase 3 で角度ユーティリティ + リプレイのテストを置く。
