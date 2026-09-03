import type { Container, Text } from 'pixi.js'
import type { Stage } from './Stage'
import { DANGER } from './colors'
import { godText } from './styles'
import { easeOutBack, easeOutCubic } from './ease'

export interface RepNumber {
  pop(count: number, opts: { fever?: boolean; bonus?: boolean }): void
  destroy(): void
}

/**
 * rep カウントの数字ポップ（仮・手続き描画）。
 * 通常は白、fever 中は金＋大型＋強い発光、bonus では「BONUS」タグを重ねる。
 */
export function createRepNumber(stage: Stage): RepNumber {
  const alive = new Set<Container>()

  function pop(
    count: number,
    opts: { fever?: boolean; bonus?: boolean },
  ): void {
    if (!stage.ready) return
    const fever = opts.fever === true
    const bonus = opts.bonus === true

    const wrap: Container = new stage.pixi.Container()
    const size = fever ? 168 : 124

    const label: Text = new stage.pixi.Text({
      text: String(count),
      style: godText(size, { gold: fever, glow: fever ? 28 : 8 }),
    })
    label.anchor.set(0.5)
    wrap.addChild(label)

    if (bonus) {
      const tag: Text = new stage.pixi.Text({
        text: `BONUS +${count}`,
        style: {
          fontFamily: 'Georgia, "Hiragino Mincho ProN", serif',
          fontSize: 38,
          fontWeight: '900',
          fill: DANGER,
          stroke: { color: 0x000000, width: 6 },
          letterSpacing: 4,
        },
      })
      tag.anchor.set(0.5)
      tag.y = -(size * 0.72)
      wrap.addChild(tag)
    }

    wrap.x = stage.width / 2
    wrap.y = stage.height * 0.42
    wrap.alpha = 0
    wrap.scale.set(0.4)
    stage.layers.rep.addChild(wrap)
    alive.add(wrap)

    const startY = wrap.y
    const peak = fever ? 1.5 : 1.25

    void stage
      .animate(180, (t) => {
        if (wrap.destroyed) return
        wrap.alpha = Math.min(1, t * 2)
        wrap.scale.set(0.4 + easeOutBack(t) * (peak - 0.4))
      })
      .then(() =>
        stage.animate(640, (t) => {
          if (wrap.destroyed) return
          wrap.y = startY - t * 64
          wrap.alpha = 1 - easeOutCubic(t)
          wrap.scale.set(peak - t * 0.18)
        }),
      )
      .then(() => {
        alive.delete(wrap)
        if (!wrap.destroyed) wrap.destroy({ children: true })
      })
  }

  return {
    pop,
    destroy() {
      for (const w of alive) {
        if (!w.destroyed) w.destroy({ children: true })
      }
      alive.clear()
    },
  }
}
