import type { Container, Graphics, Text } from 'pixi.js'
import type { Stage } from './Stage'
import type { SoundController } from './sound'
import { GOLD, WHITE } from './colors'
import { godText } from './styles'
import { easeOutBack } from './ease'

export interface Praise {
  /** セット完了の賞賛バースト。 */
  burst(): void
  destroy(): void
}

interface Particle {
  node: Container
  vx: number
  vy: number
  life: number
  max: number
  spin: number
}

/** セット完了の賞賛（金の破片が弾ける + 「COMPLETE」）。仮・手続き描画。 */
export function createPraise(stage: Stage, sound: SoundController): Praise {
  const particles: Particle[] = []
  let stop: (() => void) | null = null

  const ensureLoop = (): void => {
    if (stop) return
    stop = stage.onFrame((ticker) => {
      const dt = ticker.deltaMS / 1000
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        if (!p) continue
        p.life += dt
        p.vy += 1000 * dt
        p.node.x += p.vx * dt
        p.node.y += p.vy * dt
        p.node.rotation += p.spin * dt
        p.node.alpha = Math.max(0, 1 - p.life / p.max)
        if (p.life >= p.max) {
          if (!p.node.destroyed) p.node.destroy()
          particles.splice(i, 1)
        }
      }
      if (particles.length === 0) {
        stop?.()
        stop = null
      }
    })
  }

  function burst(): void {
    if (!stage.ready) return
    sound.celebrate()

    const cx = stage.width / 2
    const cy = stage.height * 0.44

    const text: Text = new stage.pixi.Text({
      text: 'COMPLETE',
      style: godText(84, { glow: 18 }),
    })
    text.anchor.set(0.5)
    text.x = cx
    text.y = cy
    text.alpha = 0
    text.scale.set(0.4)
    stage.layers.rep.addChild(text)

    void stage
      .animate(200, (t) => {
        if (text.destroyed) return
        text.alpha = Math.min(1, t * 2)
        text.scale.set(0.4 + easeOutBack(t) * 0.6)
      })
      .then(() => stage.wait(680))
      .then(() =>
        stage.animate(320, (t) => {
          if (!text.destroyed) text.alpha = 1 - t
        }),
      )
      .then(() => {
        if (!text.destroyed) text.destroy()
      })

    const n = 28
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + (Math.random() * 0.4 - 0.2)
      const speed = 220 + Math.random() * 320
      const node: Graphics = new stage.pixi.Graphics()
      if (Math.random() < 0.5) {
        node.rect(-4, -11, 8, 22).fill({ color: GOLD })
      } else {
        node.star(0, 0, 5, 11, 4).fill({ color: WHITE })
      }
      node.x = cx
      node.y = cy
      stage.layers.rep.addChild(node)
      particles.push({
        node,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 140,
        life: 0,
        max: 0.9 + Math.random() * 0.7,
        spin: (Math.random() * 2 - 1) * 12,
      })
    }
    ensureLoop()
  }

  return {
    burst,
    destroy() {
      stop?.()
      stop = null
      for (const p of particles) {
        if (!p.node.destroyed) p.node.destroy()
      }
      particles.length = 0
    },
  }
}
