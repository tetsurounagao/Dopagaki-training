// 演出レイヤーの実体。ステートマシン(B)はここから createEffectsController を import する。
// コントラクトは ./types.ts（ロック済み）。
//
// 方針:
// - import 時に DOM / WebGL に一切触れない。初期化は mount() の中だけ。
// - mount() 前・unmount() 後にどのメソッドを呼んでも throw しない（各サブ演出を null ガード）。
// - 描画は PixiJS v8 の手続き描画のみ、音は Web Audio 合成のみ（Phase 1 は仮アセット）。

import type { EffectsController } from './types'
import { Stage } from './Stage'
import { createSound } from './sound'
import { createGauge, type Gauge } from './gauge'
import { createRepNumber, type RepNumber } from './repNumber'
import { createFever, type Fever } from './fever'
import { createLightning, type Lightning } from './lightning'
import { createPraise, type Praise } from './praise'
import { createTransition, type Transition } from './transition'
import { createCountdown, type Countdown } from './countdown'

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return n < 0 ? 0 : n > 1 ? 1 : n
}

export function createEffectsController(): EffectsController {
  const sound = createSound()

  let stage: Stage | null = null
  let gauge: Gauge | null = null
  let rep: RepNumber | null = null
  let fever: Fever | null = null
  let lightning: Lightning | null = null
  let praise: Praise | null = null
  let transition: Transition | null = null
  let countdown: Countdown | null = null
  let mounting: Promise<void> | null = null

  async function doMount(container: HTMLElement): Promise<void> {
    const s = new Stage()
    await s.init(container)
    stage = s
    gauge = createGauge(s)
    rep = createRepNumber(s)
    fever = createFever(s, sound)
    lightning = createLightning(s, sound)
    praise = createPraise(s, sound)
    transition = createTransition(s, sound)
    countdown = createCountdown(s)
  }

  function teardown(): void {
    gauge?.destroy()
    rep?.destroy()
    fever?.destroy()
    lightning?.destroy()
    praise?.destroy()
    transition?.destroy()
    countdown?.destroy()
    stage?.destroy()
    gauge = null
    rep = null
    fever = null
    lightning = null
    praise = null
    transition = null
    countdown = null
    stage = null
  }

  return {
    mount(container) {
      if (stage) return Promise.resolve()
      if (mounting) return mounting
      // WebGL 非対応環境（テストの jsdom など）では init が reject する。
      // その場合は no-op モードに落として、以降のメソッド呼び出しは黙って無視する。
      mounting = doMount(container)
        .catch((err: unknown) => {
          console.warn('[effects] mount failed; running in no-op mode', err)
          teardown()
        })
        .finally(() => {
          mounting = null
        })
      return mounting
    },

    unmount() {
      mounting = null
      teardown()
      // 読み上げ中の音声も止める。
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // noop
        }
      }
    },

    setGauge(ratio) {
      gauge?.set(clamp01(ratio))
    },

    popRep(count, opts) {
      const o = opts ?? {}
      rep?.pop(count, o)
      sound.rep(o.fever === true)
    },

    startFever() {
      fever?.start()
    },

    endFever() {
      fever?.end()
    },

    finalSetTail(repsRemaining) {
      lightning?.tail(repsRemaining)
    },

    setCompleteCelebration() {
      praise?.burst()
    },

    playSetIntro() {
      return transition ? transition.play() : Promise.resolve()
    },

    countdownTick(n) {
      countdown?.tick(n)
      sound.countdown(n)
    },

    voiceCount(n) {
      sound.voice(n)
    },

    setSoundEnabled(v) {
      sound.setEnabled(v)
    },

    setVoiceEnabled(v) {
      sound.setVoiceEnabled(v)
    },
  }
}
