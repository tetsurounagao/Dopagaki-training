# Dopagaki Training（ドパガキ）

スマホ内カメラで筋トレ動作をリアルタイム認識し、回数に応じてパチスロ風の派手な演出を出す Web アプリ（PWA）。
辛い筋トレをドーパミンで乗り切らせるのがコンセプト。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 不変の前提・確定事項・進め方ルール（AI/開発者向け） |
| [実装計画.md](実装計画.md) | フェーズ別マイルストーン、データモデル、RepDetector 設計、サブエージェント運用 |
| [デプロイ・実機検証計画.md](デプロイ・実機検証計画.md) | デプロイ環境、実機検証マトリクス、挙動検証の測り方、チェックリスト |
| [docs/](docs/) | フェーズごとの使い捨て作業メモ |

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm run build        # 本番ビルド（tsc -b && vite build）
npm run preview      # 本番ビルドをローカル確認
npm run typecheck    # tsc -b
npm run lint         # oxlint（--deny-warnings）
npm run format       # prettier --write
npm test             # vitest run
npm run gen:icons    # public/pwa-*.png を再生成（仮アイコン）
```

Node は `.nvmrc`（22）。

## スタック

React 19 + TypeScript + Vite 8 / vite-plugin-pwa / react-router / Dexie（IndexedDB）。
姿勢推定は MediaPipe（Phase 2〜）、演出は PixiJS + Lottie（Phase 1〜）。
バックエンドなし・データは端末内のみ・アナリティクスなし。

## 進捗

- **Phase 0（基盤）**: 進行中 — scaffold / ルーティング骨組み / Dexie スキーマ / CI。
- Phase 1〜5 は [実装計画.md](実装計画.md) §8。
