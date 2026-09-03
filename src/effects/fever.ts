import type { Graphics, Text } from 'pixi.js'
import type { Stage } from './Stage'
import type { SoundController } from './sound'
import { GOLD } from './colors'
import { godText } from './styles'
import { easeOutBack, easeOutCubic } from './ease'

export interface Fever {
  start(): void
  end(): void
  destroy(): void
}

/**
 * フィーバー突入・終了演出（GOD 系・仮アセット）。
 * 突入: 金フラッシュ + 放射 + 大型「FEVER」インパクト + 画面シェイク。
 * 継続中: 画面ふちに金の枠を脈動表示。
 * 終了: 枠をフェードアウト。
 */
export function createFever(stage: Stage, sound: SoundController): Fever {
  const border: Graphics = new stage.pixi.Graphics()
  border.alpha = 0
  stage.layers.fever.addChild(border)

  let pulseStop: (() => void) | null = null
  let active = false

  const drawBorder = (): void => {
    if (border.destroyed) return
    const w = stage.width
    const h = stage.height
    const t = Math.max(20, Math.min(w, h) * 0.11)
    border.clear()
    border.rect(0, 0, w, t).fill({ color: GOLD, alpha: 0.28 })
    border.rect(0, h - t, w, t).fill({ color: GOLD, alpha: 0.28 })
    border.rect(0, 0, t, h).fill({ color: GOLD, alpha: 0.28 })
    border.rect(w - t, 0, t, h).fill({ color: GOLD, alpha: 0.28 })
  }

  function start(): void {
    if (!stage.ready || active) return
    active = true
    sound.feverStart()
    drawBorder()

    const w = stage.width
    const h = stage.height

    const flash: Graphics = new stage.pixi.Graphics()
    flash.rect(0, 0, w, h).fill({ color: GOLD })
    stage.layers.fever.addChild(flash)

    const rays: Graphics = new stage.pixi.Graphics()
    const cx = w / 2
    const cy = h / 2
    const r = Math.hypot(w, h)
    for (let i = 0; i < 24; i++) {
      const a0 = (Math.PI * 2 * i) / 24
      const a1 = a0 + Math.PI / 48
      rays
        .moveTo(cx, cy)
        .lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r)
        .lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r)
        .fill({ color: GOLD, alpha: 0.5 })
    }
    stage.layers.fever.addChild(rays)

    const text: Text = new stage.pixi.Text({
      text: 'FEVER',
      style: godText(140, { glow: 32 }),
    })
    text.anchor.set(0.5)
    text.x = cx
    text.y = cy
    text.alpha = 0
    text.scale.set(0.3)
    stage.layers.fever.addChild(text)

    void stage.shake(460, 18)

    void stage
      .animate(140, (t) => {
        if (!flash.destroyed) flash.alpha = 1 - t
        if (!rays.destroyed) rays.alpha = 0.6 * (1 - t)
      })
      .then(() =>
        stage.animate(360, (t) => {
          if (!rays.destroyed) rays.rotation = t * 0.5
        }),
      )
      .then(() => {
        if (!flash.destroyed) flash.destroy()
        if (!rays.destroyed) rays.destroy()
      })

    void stage
      .animate(220, (t) => {
        if (text.destroyed) return
        text.alpha = Math.min(1, t * 2)
        text.scale.set(0.3 + easeOutBack(t) * 1.0)
      })
      .then(() => stage.wait(600))
      .then(() =>
        stage.animate(280, (t) => {
          if (!text.destroyed) text.alpha = 1 - t
        }),
      )
      .then(() => {
        if (!text.destroyed) text.destroy()
      })

    void stage.animate(300, (t) => {
      if (!border.destroyed) border.alpha = t * 0.8
    })

    let phase = 0
    pulseStop = stage.onFrame((ticker) => {
      if (border.destroyed) return
      phase += ticker.deltaMS / 1000
      border.alpha = 0.62 + Math.sin(phase * 6) * 0.16
    })
  }

  function end(): void {
    if (!active) return
    active = false
    sound.feverEnd()
    pulseStop?.()
    pulseStop = null
    const from = border.destroyed ? 0 : border.alpha
    void stage.animate(
      420,
      (t) => {
        if (!border.destroyed) border.alpha = from * (1 - t)
      },
      easeOutCubic,
    )
  }

  return {
    start,
    end,
    destroy() {
      pulseStop?.()
      pulseStop = null
      active = false
      if (!border.destroyed) border.destroy()
    },
  }
}
