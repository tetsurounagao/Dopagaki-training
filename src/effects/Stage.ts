import type * as PIXI from 'pixi.js'
import type { Application, Container, Ticker } from 'pixi.js'
import { NEAR_BLACK } from './colors'
import { linear } from './ease'

/** 演出の重ね順レイヤー。手前ほど後ろに addChild する。 */
export interface StageLayers {
  /** 背景（ゲージの下地など） */
  bg: Container
  /** エネルギーゲージ */
  gauge: Container
  /** rep 数字ポップ・賞賛バースト */
  rep: Container
  /** フィーバー中の常設ビジュアル（ふち・脈動） */
  fever: Container
  /** 稲妻・画面フラッシュ */
  fx: Container
  /** 最前面の全画面演出（カウントダウン・セット突入トランジション） */
  overlay: Container
}

type UpdateFn = (t: number) => void
type EaseFn = (t: number) => number

/**
 * PixiJS v8 の Application を包む薄いラッパ。
 * import 時には一切 DOM/WebGL に触れない。pixi.js の読み込みも含めてすべて
 * init() の中でだけ行う（動的 import）。
 */
export class Stage {
  private app: Application | null = null
  private ro: ResizeObserver | null = null
  private host: HTMLElement | null = null

  destroyed = false
  // init() 完了後に必ずセットされる。
  layers!: StageLayers
  /** init() 内で動的 import した pixi.js 名前空間。サブ演出はここから構築子を取る。 */
  pixi!: typeof PIXI

  /** 論理（CSS）ピクセルの描画幅 */
  get width(): number {
    return this.app?.screen.width ?? 0
  }

  /** 論理（CSS）ピクセルの描画高さ */
  get height(): number {
    return this.app?.screen.height ?? 0
  }

  get root(): Container | null {
    return this.app?.stage ?? null
  }

  get ready(): boolean {
    return this.app !== null && !this.destroyed
  }

  async init(host: HTMLElement): Promise<void> {
    // pixi.js は canUseNewCanvasBlendModes 等で import 時に getContext を触るため、
    // ここで初めて読み込む（SSR / テストの import 安全性のため）。
    const pixi = await import('pixi.js')
    this.pixi = pixi

    const app = new pixi.Application()
    const rect = host.getBoundingClientRect()
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1

    await app.init({
      width: Math.max(1, Math.round(rect.width || host.clientWidth || 360)),
      height: Math.max(1, Math.round(rect.height || host.clientHeight || 640)),
      background: NEAR_BLACK,
      // 実行画面（カメラ映像）の上に透過で重ねる。
      backgroundAlpha: 0,
      antialias: true,
      resolution: dpr,
      autoDensity: true,
      powerPreference: 'high-performance',
    })

    this.app = app
    this.host = host

    const canvas = app.canvas
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    // タップ領域（rep カウント）は下の DOM 側にあるので、演出キャンバスは操作を透過させる。
    canvas.style.pointerEvents = 'none'
    host.appendChild(canvas)

    const mk = (): Container => {
      const c = new pixi.Container()
      app.stage.addChild(c)
      return c
    }
    this.layers = {
      bg: mk(),
      gauge: mk(),
      rep: mk(),
      fever: mk(),
      fx: mk(),
      overlay: mk(),
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize())
      this.ro.observe(host)
    }
  }

  private resize(): void {
    if (!this.app || !this.host || this.destroyed) return
    const w = Math.max(1, Math.round(this.host.clientWidth))
    const h = Math.max(1, Math.round(this.host.clientHeight))
    this.app.renderer.resize(w, h)
  }

  /**
   * duration(ms) かけて onUpdate(t) を毎フレーム呼ぶ。t はイージング後の 0..1。
   * duration<=0 や未初期化・破棄済みでも onUpdate(1) を一度呼んで即 resolve する
   * （呼び出し側のタイムラインを止めないため）。
   */
  animate(
    durationMs: number,
    onUpdate: UpdateFn,
    ease: EaseFn = linear,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.app || this.destroyed || durationMs <= 0) {
        onUpdate(1)
        resolve()
        return
      }
      const app = this.app
      let elapsed = 0
      const tick = (ticker: Ticker): void => {
        if (this.destroyed) {
          app.ticker.remove(tick)
          resolve()
          return
        }
        elapsed += ticker.deltaMS
        const raw = elapsed >= durationMs ? 1 : elapsed / durationMs
        onUpdate(ease(raw))
        if (raw >= 1) {
          app.ticker.remove(tick)
          resolve()
        }
      }
      app.ticker.add(tick)
    })
  }

  /** 毎フレーム fn を呼ぶ。返り値を呼ぶと解除。 */
  onFrame(fn: (ticker: Ticker) => void): () => void {
    if (!this.app || this.destroyed) return () => {}
    const app = this.app
    app.ticker.add(fn)
    return () => app.ticker.remove(fn)
  }

  /** 破棄されても必ず resolve する単純待機。 */
  wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
  }

  /** ステージ全体を揺らす（重量感の演出）。 */
  shake(durationMs = 400, intensity = 12): Promise<void> {
    const root = this.root
    if (!root) return Promise.resolve()
    const baseX = root.x
    const baseY = root.y
    return this.animate(durationMs, (t) => {
      if (this.destroyed) return
      const decay = 1 - t
      root.x = baseX + (Math.random() * 2 - 1) * intensity * decay
      root.y = baseY + (Math.random() * 2 - 1) * intensity * decay
      if (t >= 1) {
        root.x = baseX
        root.y = baseY
      }
    })
  }

  destroy(): void {
    this.destroyed = true
    this.ro?.disconnect()
    this.ro = null
    if (this.app) {
      try {
        this.app.destroy({ removeView: true }, { children: true })
      } catch {
        // レンダラ初期化が中途半端でも黙って捨てる。
      }
      this.app = null
    }
    this.host = null
  }
}
