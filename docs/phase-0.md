# Phase 0 作業メモ（使い捨て）

目的: プロジェクト基盤。詳細は [実装計画.md](../実装計画.md) §8 Phase 0。

## 完了

- Vite 8 + React 19 + TS 6 scaffold（create-vite ベース、oxlint 同梱）
- Prettier 追加（`format` / `format:check`）
- Vitest 4 + jsdom + @testing-library/react + fake-indexeddb
- GitHub Actions（`.github/workflows/ci.yml`）: lint / format:check / typecheck / test / build
- ルーティング骨組み（react-router）: `/` `/onboarding` `/workout` `/result`（`*` → `/`）
- 画面スタブ: RoutineList / Onboarding（体重登録は実際に Dexie 保存）/ Workout / Result
- Dexie スキーマ（`src/store/db.ts`）: exercises / settings / calibrations / routines / sessions
  - 種目マスタ 5 件を populate で seed
  - `finishedAt` は null を索引できないためインデックスにせず filter で進行中を拾う
- ドメイン型 `src/domain/types.ts`（実装計画 §4 と一致）+ `effectiveWeightKg()`
- pose 型スタブ `src/pose/types.ts`（Phase 2 の I/F）
- store ヘルパ: settings / routines / sessions / calibration（多くは Phase 1〜3 の TODO）
- PWA: vite-plugin-pwa（autoUpdate、manifest、precache）。仮アイコンを `scripts/gen-icons.mjs` で生成
- デプロイ用: `public/_headers` `public/_redirects` `.nvmrc`

## 検証結果（ローカル）

- `npm run typecheck` / `lint` / `format:check` / `test`(8 passed) / `build` すべて green
- `npm run preview` で `/` `/workout`(deep link) `/manifest.webmanifest` が 200

## 残（このフェーズの受け入れに必要な手動作業）

- [ ] **Cloudflare Pages（or Vercel）にリポジトリ連携**（OAuth のため手動）
  - Build command `npm run build` / Output `dist` / Node 22（`.nvmrc` 参照）
  - `main` push → 本番 URL、ブランチ/PR → プレビュー URL を確認
- [ ] 実機 1 台でホーム画面追加（インストール）まで確認

## 次フェーズへの申し送り

- Phase 1 開始時にまず固める型: Dexie スキーマ（済）/ ステートマシン遷移 / `game/` の I/F / effects の関数シグネチャ。
- `src/store/sessions.ts` の集計（totalVolumeKg / totalPoints）は `game/PointsEngine` 側に置く。
- oxlint はデフォルトで warning を exit 0 にするため、CI は `--deny-warnings` で回している。
