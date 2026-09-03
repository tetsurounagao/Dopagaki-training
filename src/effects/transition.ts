import type { Graphics, Text } from 'pixi.js'
import type { Stage } from './Stage'
import type { SoundController } from './sound'
import { NEAR_BLACK, WHITE } from './colors'
import { godText } from './styles'
import { easeOutBack, easeOutCubic } from './ease'

export interface Transition {
  /** 「もう1セット突入」トランジション。演出の完了で resolve。 */
  play(): Promise<void>
  destroy(): void
}

/**
 * 暗転 → フラッシュ → 大型テキストの3フェーズ。
 * 各フェーズは Stage.animate / Stage.wait を await で直列につなぐ。
 * Stage.animate は破棄済みでも即 resolve、Stage.wait は setTimeout なので
 * どんな状態でもタイムラインが止まらず、play() は必ず resolve する。
 */
export function createTransition(
  stage: Stage,
  sound: SoundController,
): Transition {
  let running: Promise<void> | null = null

  async function run(): Promise<void> {
    const layer = stage.layers.overlay
    const w = stage.width
    const h = stage.height

    const black: Graphics = new stage.pixi.Graphics()
    black.rect(0, 0, w, h).fill({ color: NEAR_BLACK })
    black.alpha = 0
    layer.addChild(black)

    const flash: Graphics = new stage.pixi.Graphics()
    flash.rect(0, 0, w, h).fill({ color: WHITE })
    flash.alpha = 0
    layer.addChild(flash)

    const text: Text = new stage.pixi.Text({
      text: 'もう1セット突入',
      style: godText(Math.min(96, w * 0.13), { glow: 30 }),
    })
    text.anchor.set(0.5)
    text.x = w / 2
    text.y = h / 2
    text.alpha = 0
    text.scale.set(0.35)
    layer.addChild(text)

    try {
      // 1. 暗転（~320ms）
      sound.whoosh()
      await stage.animate(
        320,
        (t) => {
          if (!black.destroyed) black.alpha = t
        },
        easeOutCubic,
      )

      // 2. フラッシュ（立ち上がり ~110ms → 減衰 ~220ms）
      sound.impact()
      await stage.animate(110, (t) => {
        if (!flash.destroyed) flash.alpha = t
      })
      await stage.animate(220, (t) => {
        if (!flash.destroyed) flash.alpha = 1 - t
      })

      // 3. 大型テキスト（インパクト ~260ms → ホールド ~820ms → 退場 ~300ms）
      void stage.shake(360, 14)
      await stage.animate(260, (t) => {
        if (text.destroyed) return
        text.alpha = Math.min(1, t * 2)
        text.scale.set(0.35 + easeOutBack(t) * 0.65)
      })
      await stage.wait(820)
      await stage.animate(
        300,
        (t) => {
          if (!text.destroyed) text.alpha = 1 - t
          if (!black.destroyed) black.alpha = 1 - t
        },
        easeOutCubic,
      )
    } catch {
      // 演出中に unmount されても呼び出し側（ステートマシン）は待っているので握り潰す。
    } finally {
      for (const node of [black, flash, text]) {
        if (!node.destroyed) node.destroy()
      }
    }
  }

  return {
    play() {
      if (!stage.ready) return Promise.resolve()
      if (running) return running
      running = run().finally(() => {
        running = null
      })
      return running
    },
    destroy() {
      // overlay ノードは run() の finally で毎回破棄している。
    },
  }
}
