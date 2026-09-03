import type { Text } from 'pixi.js'
import type { Stage } from './Stage'
import { godText } from './styles'
import { easeOutBack, easeOutCubic } from './ease'

export interface Countdown {
  /** カウントダウン数字を1つ表示（3, 2, 1 ...）。n<=1 は「GO」。 */
  tick(n: number): void
  destroy(): void
}

/** カウントダウンの数字ポップ（仮・手続き描画）。音は controller 側で sound.countdown を鳴らす。 */
export function createCountdown(stage: Stage): Countdown {
  function tick(n: number): void {
    if (!stage.ready) return
    const last = n <= 1
    const label: Text = new stage.pixi.Text({
      text: last ? 'GO' : String(n),
      style: godText(Math.min(220, stage.width * 0.4), {
        gold: last,
        glow: last ? 30 : 14,
      }),
    })
    label.anchor.set(0.5)
    label.x = stage.width / 2
    label.y = stage.height / 2
    label.alpha = 0
    label.scale.set(1.6)
    stage.layers.overlay.addChild(label)

    void stage
      .animate(150, (t) => {
        if (label.destroyed) return
        label.alpha = Math.min(1, t * 2)
        label.scale.set(1.6 - easeOutBack(t) * 0.6)
      })
      .then(() =>
        stage.animate(520, (t) => {
          if (label.destroyed) return
          label.alpha = 1 - easeOutCubic(t)
          label.scale.set(1 - t * 0.18)
        }),
      )
      .then(() => {
        if (!label.destroyed) label.destroy()
      })
  }

  return {
    tick,
    destroy() {
      // 常設ノードは持たない。
    },
  }
}
