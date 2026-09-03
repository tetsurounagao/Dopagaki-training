# Phase 1: タップカウンタ版で「ドーパミンループ」を完成

> GitHub Issue: [#2](https://github.com/tetsurounagao/Dopagaki-training/issues/2)
> PR は "Closes #2" を含める。

## ゴール

カメラ・姿勢推定なしで、体験の芯（ルーティン登録 → 実行 → 演出 → フィーバー → 分岐 → リザルト）を最後まで通せる状態にする。rep は画面タップでカウントする。この上に Phase 2 以降で CV を載せる。

参照: [実装計画.md](../../実装計画.md) §8 Phase 1 / §4 データモデル / §5 ステートマシン / §7（キャリブレーションは空実装）

## スコープ（成果物）

### 1. ルーティン登録 UI
- 一覧・新規・編集・削除（Dexie `routines`）。
- Menu 単位で: 種目（固定4 + その他）/ 重量kg（**0.5 刻み・下限0**）/ reps/set / sets / restSec。
- 同種目・別重量は Menu を分ける（ピラミッドは非対応）。
- バリデーション: menus 非空、reps・sets ≥ 1。

### 2. 実行画面ステートマシン（`app/machine.ts` + `features/workout/`）
- 状態: ホーム → (続きから?) → カメラ承認[Phase1 ではスキップ扱い] → 種目セットアップ → **キャリブレーション（空実装・スキップ可）** → カウントダウン → セット中 → セット完了 → インターバル → 分岐 → （次メニュー or リザルト）。
- セット中: 大きいタップ領域で rep+1 / 音声カウント（`voiceCountEnabled`）/ ゲージ充填 / 数字ポップ。
- 目標 rep 到達で**自動終了しない**。超過は「BONUS +N」。一定時間 無操作でセット完了 → 次へ。
- インターバル: restSec カウントダウン、「スキップ」「+30秒」。
- 分岐: 「もう1セットやる」= 暗転 → フラッシュ → 「もう1セット突入」大型テキスト → カウントダウン。「次のメニューへ」= 次 Menu or リザルト。

### 3. `game/`（`PointsEngine` + `feverMachine`）
- `feverMachine`: rep ごとにゲージ加算 + 抽選。満タン or 当選で**フィーバー発動**（一定 rep/秒で終了、倍率 ×2）。確率・ゲージ量・継続は**調整可能な定数**（`game/config.ts`）に仮値で置く（§12-1）。
- `PointsEngine`: rep イベントを消費して `points += effectiveWeightKg × 倍率`、`totalVolumeKg += effectiveWeightKg`。
- ユニットテスト: rep 列を入力してポイント・フィーバー・倍率適用を検証。

### 4. 演出（`effects/`、PixiJS v8 + Lottie + Web Audio）
- ステージ、エネルギーゲージ、数字ポップ、フィーバー（**GOD 系＝重厚フォント・重量感**、仮アセット）、最終セットのみ終盤（残り5〜10rep）の稲妻・画面フラッシュ、セット完了の賞賛、「もう1セット突入」トランジション、効果音、音声 rep カウント。
- B が呼ぶ関数シグネチャに合わせる（先に I/F 確定）。
- 商用フリー確定前なので仮アセット。Phase 1 デモ後に差し替え。

### 5. リザルト画面
- **総重量**（Σ rep×実効重量）と **ポイント**（フィーバー込み）の2値 + 種目別内訳。
- セッションを `finishedAt` 付きで確定保存。

### 6. 進行中セッションの永続化・復帰
- rep 完了ごと・状態遷移ごとに `WorkoutSession`（`progress`/`entries`）を Dexie に保存。`finishedAt` はリザルトで確定。
- 起動時に `finishedAt === null` があれば「続きから / 破棄」を提示。

## 先に確定してコミットする I/F（サブエージェント分割の前提）

- ステートマシンの状態・イベント型（`app/machine.ts`）
- `game/` の型（`RepEvent`, `FeverState`, `PointsSnapshot`, `GameConfig`）
- `effects/` の関数シグネチャ（`onRep`, `onFever`, `onSetComplete`, `onTransition` など）
- Dexie スキーマは Phase 0 で確定済み

## サブエージェント分割（並列）

- **A**: ルーティン登録 UI + Dexie CRUD + オンボーディング微調整（`store/`, `features/routine/`, `features/onboarding/`）
- **B**: 実行画面ステートマシン + 遷移 + セッション永続化/復帰 + `game/`（`app/`, `features/workout/`, `game/`）。演出は stub 呼び出し
- **C**: `effects/` 一式（PixiJS + Lottie + sound + 音声カウント）
- 統合・結線は親。

## 受け入れ条件

- [ ] カメラなしで1ルーティンを最初から最後まで完走できる
- [ ] フィーバーが発動し、発動中の rep はポイントが ×2 になる
- [ ] 最終セットの終盤で稲妻・フラッシュが増える（他セットでは出ない）
- [ ] 目標 rep 超過で BONUS 表示、無操作でセット完了に進む
- [ ] 「もう1セット」「次へ」の分岐が動く
- [ ] リザルトに総重量とポイントが正しく出る（フィーバーなしなら一致）
- [ ] リロード / バックグラウンド kill 後に「続きから」で正しい地点に復帰
- [ ] `typecheck` / `lint` / `format:check` / `test` / `build` が green

## スコープ外（Phase 1 でやらない）

- カメラ・姿勢推定・RepDetector（Phase 2〜3）
- キャリブレーションの中身（Phase 3。空実装のみ）
- 演出の最終アセット（Phase 1 デモ後にすり合わせ → 差し替え）
- フィーバー数値の作り込み（仮値。§12-1 で後日チューニング）
- 履歴一覧画面（Phase 5）

## メモ

- `src/store/sessions.ts` の集計は `game/PointsEngine` 側に置き、store は保存のみ。
