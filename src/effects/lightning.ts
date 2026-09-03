import type { Graphics } from 'pixi.js'
import type { Stage } from './Stage'
import type { SoundController } from './sound'
import { LIGHTNING, WHITE } from './colors'

export interface Lightning {
  /** 残り rep 数。少ないほど稲妻・フラッシュ・シェイクが強くなる。 */
  tail(repsRemaining: number): void
  destroy(): void
}

/** この rep 数以下で終盤演出が始まり、0 で最大強度。 */
const RAMP_FROM = 8

function drawBolt(
  g: Graphics,
  w: number,
  h: number,
  intensity: number,
  vertical: boolean,
): void {
  const segs = 6 + Math.floor(Math.random() * 6)
  let x = vertical ? Math.random() * w : 0
  let y = vertical ? 0 : Math.random() * h
  g.moveTo(x, y)
  for (let i = 0; i < segs; i++) {
    if (vertical) {
      x += (Math.random() * 2 - 1) * w * 0.13
      y += h / segs
    } else {
      x += w / segs
      y += (Math.random() * 2 - 1) * h * 0.13
    }
    g.lineTo(x, y)
  }
  g.stroke({
    color: LIGHTNING,
    width: 2 + intensity * 4,
    alpha: 0.85,
  })
}

/**
 * 最終セット終盤の稲妻 + 画面フラッシュ（仮・手続き描画）。
 * finalSetTail 以外からは呼ばれない前提。
 */
export function createLightning(
  stage: Stage,
  sound: SoundController,
): Lightning {
  function tail(repsRemaining: number): void {
    if (!stage.ready) return
    const clamped = Math.max(0, repsRemaining)
    const intensity = Math.max(
      0.15,
      Math.min(1, (RAMP_FROM - clamped) / RAMP_FROM),
    )

    sound.thunder(intensity)

    const w = stage.width
    const h = stage.height

    const bolts: Graphics = new stage.pixi.Graphics()
    stage.layers.fx.addChild(bolts)
    const count = 1 + Math.round(intensity * 4)
    for (let b = 0; b < count; b++) {
      drawBolt(bolts, w, h, intensity, b % 2 === 0)
    }

    const flash: Graphics = new stage.pixi.Graphics()
    flash.rect(0, 0, w, h).fill({ color: WHITE })
    flash.alpha = 0
    stage.layers.fx.addChild(flash)

    void stage.shake(200 + intensity * 320, 6 + intensity * 20)

    const peak = intensity * 0.85

    void stage
      .animate(80, (t) => {
        if (!flash.destroyed) flash.alpha = peak * t
      })
      .then(() =>
        stage.animate(260, (t) => {
          if (!flash.destroyed) flash.alpha = peak * (1 - t)
          if (!bolts.destroyed) bolts.alpha = 1 - t
        }),
      )
      .then(() => {
        if (!bolts.destroyed) bolts.destroy()
        if (!flash.destroyed) flash.destroy()
      })
  }

  return {
    tail,
    destroy() {
      // 常設ノードは持たない。
    },
  }
}
