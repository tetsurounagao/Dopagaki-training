import type { Graphics } from 'pixi.js'
import type { Stage } from './Stage'
import { GOLD, GOLD_DIM, NEAR_BLACK } from './colors'

export interface Gauge {
  /** 目標比率 0..1 をセット。表示はイージングで追従する。 */
  set(ratio: number): void
  destroy(): void
}

/**
 * 画面下端のエネルギーゲージ。手続き描画のみ（仮）。Phase 5 で素材差し替え。
 * 値の追従は毎フレーム lerp。満タン付近で発光ラインを足す。
 */
export function createGauge(stage: Stage): Gauge {
  const g: Graphics = new stage.pixi.Graphics()
  stage.layers.gauge.addChild(g)

  let current = 0
  let target = 0

  const draw = (): void => {
    if (g.destroyed) return
    const w = stage.width
    const h = stage.height
    if (w <= 0 || h <= 0) return
    const barH = Math.max(6, Math.round(h * 0.016))
    const y = h - barH
    const ratio = Math.max(0, Math.min(1, current))
    const fillW = ratio * w

    g.clear()
    g.rect(0, y, w, barH).fill({ color: NEAR_BLACK, alpha: 0.55 })
    g.rect(0, y, fillW, barH).fill({
      color: ratio >= 0.999 ? GOLD : GOLD_DIM,
    })
    if (ratio > 0.7) {
      const glow = (ratio - 0.7) / 0.3
      g.rect(0, y - 2, fillW, 2).fill({ color: GOLD, alpha: glow })
    }
  }

  const stop = stage.onFrame(() => {
    if (Math.abs(current - target) < 0.001) {
      if (current !== target) {
        current = target
        draw()
      }
      return
    }
    current += (target - current) * 0.18
    draw()
  })

  draw()

  return {
    set(ratio) {
      const n = Number.isFinite(ratio) ? ratio : 0
      target = Math.max(0, Math.min(1, n))
    },
    destroy() {
      stop()
      if (!g.destroyed) g.destroy()
    },
  }
}
