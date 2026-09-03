# Phase 1 作業メモ（使い捨て）

Issue: [#2](https://github.com/tetsurounagao/Dopagaki-training/issues/2) ／ PR: #3
詳細スコープは [issues/phase-1.md](issues/phase-1.md)。

## 完了

- **I/F 確定・コミット**（`0b9bb06`）: `app/machine.ts` の状態/イベント/コンテキスト型、`game/types.ts`（`reduceRep` 純関数）、`game/config.ts`（仮値）、`effects/types.ts`（`EffectsController` + `nullEffects`）
- **A（サブエージェント）**: `RoutineEditorScreen`、`store/routines.ts` の `validateRoutine`/`newRoutine`/`newMenu`、`/routine/new`・`/routine/:id`
- **B（本体）**: `workoutReducer` + セレクタ、`useWorkout`（タイマー/逐次保存/復帰/game→effects）、`WorkoutScreen` の状態別ビュー、`ResultScreen`（総重量＋ポイント＋種目別）、`store/sessions.ts`（`createSession`/`computeEffectiveWeights`）
- **C（サブエージェント）**: `src/effects/` 一式（PixiJS v8 動的 import + Web Audio 合成、GOD 系、手続き的描画のみ）
- **統合（本体）**: `createEffectsController()` を `WorkoutScreen` に結線（固定配置 canvas を UI 背面にマウント）
- **テスト**: `WorkoutScreen.test.tsx` — ルーター配下で setup→…→リザルトをクリック駆動、総重量/ポイント=30 と保存を検証。`test/setup.ts` に canvas getContext スタブ

## 検証（ローカル + CI）

`typecheck` / `lint`(oxlint --deny-warnings) / `format:check` / `test`(**41 passed**) / `build` すべて green。PR #3 の CI も green。

## 既知の割り切り（Phase 2 以降で解消）

- 補正（±rep）は表示 rep のみ。ポイント・総重量は実タップ基準。
- 中断復帰は「該当メニューの setup へ戻す」簡易版（セット途中の rep は失う）。
- `finalSetTail(repsRemaining)` に総目標 rep が渡らず、稲妻強度は絶対 rep 基準（残り8で開始）。
- pixi.js が SW プリキャッシュに含まれ初回 ~1.2MB。方針上は許容だが precache 除外の余地あり。
- 演出の見た目・手触りは実機未確認（headless 統合テストでロジックは担保）。レビュー/実機で確認。

## 申し送り（Phase 2）

- `pose/types.ts` は用意済み。`PoseLandmarker` を Web Worker + OffscreenCanvas で。
- `useWorkout` の REP は今 `tapRep` からのみ。自動 rep を足すときは同じ `dispatch({type:'REP'})` に流す。
- キャリブレーション状態は空実装で通過中（`CALIBRATION_SKIP`）。Phase 3 で中身。
