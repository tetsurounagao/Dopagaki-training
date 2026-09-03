// ゲーム層: rep イベントを消費してポイントとフィーバーを計算する純関数コア。
// detector / ステートマシンから独立。数値は config.ts の仮値（実装計画 §12-1 でチューニング）。

export const FEVER_MULTIPLIER = 2

export interface GameConfig {
  fever: {
    /** 1 rep で溜まるゲージ量（0..1 スケール） */
    gaugePerRep: number
    /** ゲージ満タン閾値 */
    gaugeMax: number
    /** 各 rep での即発動抽選確率（ゲージ満タンとは独立） */
    instantChancePerRep: number
    /** フィーバー継続 rep 数 */
    durationReps: number
    /** ポイント倍率 */
    multiplier: number
  }
}

export interface FeverState {
  /** 0..config.fever.gaugeMax */
  gauge: number
  active: boolean
  /** active 中の残り rep 数 */
  repsRemaining: number
  /** 通算フィーバー発動回数 */
  triggeredCount: number
}

export interface GameSnapshot {
  fever: FeverState
  /** Σ(rep × 実効重量 × 倍率) */
  totalPoints: number
  /** Σ(rep × 実効重量)。倍率非依存 */
  totalVolumeKg: number
  /** 直近 rep で加算されたポイント（演出用） */
  lastRepPoints: number
  /** 直近 rep がフィーバー中だったか（演出用） */
  lastRepWasFever: boolean
}

export interface RepInput {
  effectiveWeightKg: number
  /** テストで乱数を差し込むための注入口。省略時 Math.random */
  rng?: () => number
}

/** 1 rep 分を畳み込んで新しい snapshot を返す純関数 */
export function reduceRep(
  prev: GameSnapshot,
  input: RepInput,
  cfg: GameConfig,
): GameSnapshot {
  const rng = input.rng ?? Math.random
  const f = cfg.fever

  let { gauge, active, repsRemaining, triggeredCount } = prev.fever

  // この rep がフィーバー中に「行われる」か（rep 実行時点の状態で判定）
  const feverThisRep = active
  const multiplier = feverThisRep ? f.multiplier : 1
  const repPoints = input.effectiveWeightKg * multiplier

  // rep 後のフィーバー状態を更新
  if (active) {
    repsRemaining -= 1
    if (repsRemaining <= 0) {
      active = false
      gauge = 0
    }
  } else {
    gauge += f.gaugePerRep
    const instant = rng() < f.instantChancePerRep
    if (gauge >= f.gaugeMax || instant) {
      active = true
      repsRemaining = f.durationReps
      gauge = f.gaugeMax
      triggeredCount += 1
    }
  }

  return {
    fever: { gauge, active, repsRemaining, triggeredCount },
    totalPoints: prev.totalPoints + repPoints,
    totalVolumeKg: prev.totalVolumeKg + input.effectiveWeightKg,
    lastRepPoints: repPoints,
    lastRepWasFever: feverThisRep,
  }
}

export function initGameSnapshot(): GameSnapshot {
  return {
    fever: { gauge: 0, active: false, repsRemaining: 0, triggeredCount: 0 },
    totalPoints: 0,
    totalVolumeKg: 0,
    lastRepPoints: 0,
    lastRepWasFever: false,
  }
}

/** ゲージ表示用の 0..1 比率 */
export function gaugeRatio(s: GameSnapshot, cfg: GameConfig): number {
  return Math.min(1, s.fever.gauge / cfg.fever.gaugeMax)
}
