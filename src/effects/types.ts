// 演出層のコントラクト。ステートマシン(B)はこのインターフェースを呼ぶだけ。
// 実体(C)は PixiJS v8 + Lottie + Web Audio で実装（Phase 1 は商用フリー確定前なので仮アセット）。
// ノーススター: パチスロ「GOD」系 — 重厚フォント・重量感のある動き・シンプル・射幸心。

export interface EffectsController {
  /** PixiJS ステージ等を canvas 要素にマウント。冪等。 */
  mount(container: HTMLElement): Promise<void>
  unmount(): void

  /** エネルギーゲージ表示を更新（0..1） */
  setGauge(ratio: number): void

  /** rep カウントの数字ポップ。fever/bonus で見た目を変える */
  popRep(count: number, opts?: { fever?: boolean; bonus?: boolean }): void

  /** フィーバー突入演出（GOD 系）。全セットで起こりうる */
  startFever(): void
  /** フィーバー終了 */
  endFever(): void

  /**
   * 最終セットの終盤演出。残り rep 数に応じて稲妻・画面フラッシュの強度を上げる。
   * 最終セット以外では呼ばれない。
   */
  finalSetTail(repsRemaining: number): void

  /** セット完了の賞賛バースト */
  setCompleteCelebration(): void

  /**
   * 「もう1セット突入」トランジション（暗転 → フラッシュ → 大型テキスト）。
   * 演出の完了で resolve する（ステートマシンはこれを待って countdown へ）。
   */
  playSetIntro(): Promise<void>

  /** カウントダウン数字（3, 2, 1） */
  countdownTick(n: number): void

  /** 音声 rep カウント（「N！」） */
  voiceCount(n: number): void

  setSoundEnabled(v: boolean): void
  setVoiceEnabled(v: boolean): void
}

// 実体 createEffectsController() は src/effects/index.ts に C が実装する。
// B はそこから import する。テスト時は下の nullEffects を注入する。

/** テスト・SSR・演出 OFF 用の無音実装。B はこれを既定の差し込み先にできる。 */
export const nullEffects: EffectsController = {
  mount: () => Promise.resolve(),
  unmount: () => {},
  setGauge: () => {},
  popRep: () => {},
  startFever: () => {},
  endFever: () => {},
  finalSetTail: () => {},
  setCompleteCelebration: () => {},
  playSetIntro: () => Promise.resolve(),
  countdownTick: () => {},
  voiceCount: () => {},
  setSoundEnabled: () => {},
  setVoiceEnabled: () => {},
}
