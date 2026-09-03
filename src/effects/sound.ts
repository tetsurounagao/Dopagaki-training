// 効果音・音声カウント。
// Phase 1 はアセット未確定なので、すべて Web Audio API で手続き合成（oscillator + ノイズ）。
// Phase 5 で商用フリーの効果音素材に差し替える。
// voiceCount は SpeechSynthesis（無ければ短い合成音）で仮対応。実音声は後日ユーザーが用意。

export interface SoundController {
  setEnabled(v: boolean): void
  setVoiceEnabled(v: boolean): void
  /** ユーザー操作後に AudioContext を起こす（iOS 対策）。任意で呼ぶ。 */
  resume(): void
  /** rep カウントの短い打点。fever 中は高く硬い音に。 */
  rep(fever: boolean): void
  feverStart(): void
  feverEnd(): void
  celebrate(): void
  /** 3,2,1 のカウントダウン。n<=1 で「GO」音。 */
  countdown(n: number): void
  /** セット突入トランジションの暗転で鳴らす吸い込み音。 */
  whoosh(): void
  /** フラッシュに合わせた重い衝撃音。 */
  impact(): void
  /** 稲妻。intensity 0..1 で強度。 */
  thunder(intensity: number): void
  /** 音声 rep カウント（「N！」） */
  voice(n: number): void
}

interface ToneOpts {
  type: OscillatorType
  freq: number
  dur: number
  gain: number
  freqEnd?: number
  delay?: number
}

interface NoiseOpts {
  dur: number
  gain: number
  lowpass?: number
  highpass?: number
  delay?: number
}

type AudioCtor = typeof AudioContext

export function createSound(): SoundController {
  let enabled = true
  let voiceEnabled = true
  let ctx: AudioContext | null = null
  let master: GainNode | null = null

  function ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    const ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor })
        .webkitAudioContext
    if (!ctor) return null
    if (!ctx) {
      ctx = new ctor()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  function tone(opts: ToneOpts, force = false): void {
    if (!enabled && !force) return
    const c = ensure()
    if (!c || !master) return
    const t0 = c.currentTime + (opts.delay ?? 0)
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = opts.type
    osc.frequency.setValueAtTime(opts.freq, t0)
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.freqEnd),
        t0 + opts.dur,
      )
    }
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain), t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
    osc.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t0 + opts.dur + 0.03)
  }

  function noise(opts: NoiseOpts): void {
    if (!enabled) return
    const c = ensure()
    if (!c || !master) return
    const t0 = c.currentTime + (opts.delay ?? 0)
    const len = Math.max(1, Math.floor(c.sampleRate * opts.dur))
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const src = c.createBufferSource()
    src.buffer = buf
    let node: AudioNode = src
    if (opts.highpass !== undefined) {
      const f = c.createBiquadFilter()
      f.type = 'highpass'
      f.frequency.value = opts.highpass
      node.connect(f)
      node = f
    }
    if (opts.lowpass !== undefined) {
      const f = c.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = opts.lowpass
      node.connect(f)
      node = f
    }
    const g = c.createGain()
    g.gain.setValueAtTime(Math.max(0.0002, opts.gain), t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
    node.connect(g)
    g.connect(master)
    src.start(t0)
    src.stop(t0 + opts.dur + 0.03)
  }

  return {
    setEnabled(v) {
      enabled = v
    },
    setVoiceEnabled(v) {
      voiceEnabled = v
    },
    resume() {
      ensure()
    },
    rep(fever) {
      if (fever) {
        tone({
          type: 'square',
          freq: 880,
          freqEnd: 1180,
          dur: 0.09,
          gain: 0.28,
        })
        tone({
          type: 'triangle',
          freq: 1760,
          dur: 0.06,
          gain: 0.12,
          delay: 0.01,
        })
      } else {
        tone({
          type: 'triangle',
          freq: 520,
          freqEnd: 660,
          dur: 0.08,
          gain: 0.2,
        })
      }
    },
    feverStart() {
      tone({ type: 'sawtooth', freq: 110, freqEnd: 880, dur: 0.5, gain: 0.3 })
      tone({
        type: 'square',
        freq: 220,
        freqEnd: 1760,
        dur: 0.6,
        gain: 0.16,
        delay: 0.03,
      })
      noise({ dur: 0.7, gain: 0.25, lowpass: 6000, highpass: 300 })
    },
    feverEnd() {
      tone({ type: 'sawtooth', freq: 660, freqEnd: 120, dur: 0.45, gain: 0.22 })
    },
    celebrate() {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((f, i) => {
        tone({
          type: 'triangle',
          freq: f,
          dur: 0.5,
          gain: 0.2,
          delay: i * 0.06,
        })
      })
      noise({ dur: 0.4, gain: 0.12, highpass: 4000 })
    },
    countdown(n) {
      if (n <= 1) {
        tone({ type: 'square', freq: 660, freqEnd: 990, dur: 0.35, gain: 0.3 })
        noise({ dur: 0.25, gain: 0.14, highpass: 2000 })
      } else {
        tone({ type: 'square', freq: 330, dur: 0.18, gain: 0.26 })
      }
    },
    whoosh() {
      noise({ dur: 0.4, gain: 0.3, lowpass: 1200, highpass: 200 })
      tone({ type: 'sine', freq: 400, freqEnd: 80, dur: 0.4, gain: 0.14 })
    },
    impact() {
      tone({ type: 'sine', freq: 140, freqEnd: 40, dur: 0.45, gain: 0.4 })
      noise({ dur: 0.3, gain: 0.3, lowpass: 2500 })
    },
    thunder(intensity) {
      const k = Math.max(0, Math.min(1, intensity))
      noise({
        dur: 0.25 + k * 0.4,
        gain: 0.15 + k * 0.3,
        lowpass: 1800 + k * 4000,
        highpass: 120,
      })
      tone({
        type: 'sawtooth',
        freq: 90,
        freqEnd: 30,
        dur: 0.3 + k * 0.3,
        gain: 0.15 + k * 0.2,
      })
    },
    voice(n) {
      if (!voiceEnabled) return
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const u = new SpeechSynthesisUtterance(String(n))
          u.lang = 'ja-JP'
          u.rate = 1.15
          u.pitch = 1
          u.volume = 1
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(u)
          return
        } catch {
          // SpeechSynthesis が使えなければ合成音にフォールバック。
        }
      }
      // 仮ボイス（合成音）。Phase 1 は実音声未調達（CLAUDE.md）。sound OFF でも voice ON なら鳴らす。
      tone(
        { type: 'triangle', freq: 700, freqEnd: 900, dur: 0.15, gain: 0.4 },
        true,
      )
    },
  }
}
