import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEffectsController } from './index'
import { nullEffects, type EffectsController } from './types'

afterEach(() => {
  vi.restoreAllMocks()
})

const METHODS: (keyof EffectsController)[] = [
  'mount',
  'unmount',
  'setGauge',
  'popRep',
  'startFever',
  'endFever',
  'finalSetTail',
  'setCompleteCelebration',
  'playSetIntro',
  'countdownTick',
  'voiceCount',
  'setSoundEnabled',
  'setVoiceEnabled',
]

describe('createEffectsController (smoke)', () => {
  it('exposes exactly the EffectsController surface', () => {
    const fx = createEffectsController()
    for (const m of METHODS) {
      expect(typeof fx[m], m).toBe('function')
    }
    // nullEffects と同じキー集合であること。
    expect(Object.keys(fx).sort()).toEqual(Object.keys(nullEffects).sort())
  })

  it('never throws when methods are called before mount()', () => {
    const fx = createEffectsController()
    expect(() => {
      fx.setGauge(0.5)
      fx.setGauge(2)
      fx.setGauge(-1)
      fx.setGauge(Number.NaN)
      fx.popRep(1)
      fx.popRep(12, { fever: true })
      fx.popRep(13, { bonus: true })
      fx.popRep(14, { fever: true, bonus: true })
      fx.startFever()
      fx.endFever()
      fx.finalSetTail(8)
      fx.finalSetTail(0)
      fx.setCompleteCelebration()
      fx.countdownTick(3)
      fx.countdownTick(1)
      fx.voiceCount(2)
      fx.setSoundEnabled(false)
      fx.setSoundEnabled(true)
      fx.setVoiceEnabled(false)
      fx.setVoiceEnabled(true)
      fx.unmount()
    }).not.toThrow()
  })

  it('playSetIntro() resolves even without mount()', async () => {
    const fx = createEffectsController()
    await expect(fx.playSetIntro()).resolves.toBeUndefined()
  })

  it('mount() under jsdom (no WebGL) resolves and stays in no-op mode', async () => {
    // jsdom は getContext 未実装。null を返させて Pixi をクリーンに失敗させ、
    // not-implemented のノイズを出さずに no-op フォールバックを検証する。
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const fx = createEffectsController()
    const host = document.createElement('div')
    document.body.appendChild(host)

    await expect(fx.mount(host)).resolves.toBeUndefined()
    // 二重 mount は冪等。
    await expect(fx.mount(host)).resolves.toBeUndefined()

    expect(() => {
      fx.setGauge(0.3)
      fx.popRep(3)
      fx.countdownTick(2)
      fx.startFever()
      fx.finalSetTail(4)
      fx.setCompleteCelebration()
      fx.endFever()
      fx.unmount()
    }).not.toThrow()

    await expect(fx.playSetIntro()).resolves.toBeUndefined()

    host.remove()
  })
})
