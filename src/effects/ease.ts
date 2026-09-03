// 補間イージング。Stage.animate に渡す。

export const linear = (t: number): number => t

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

export const easeInCubic = (t: number): number => t * t * t

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** 行き過ぎて戻る（重量感のあるインパクト用） */
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
