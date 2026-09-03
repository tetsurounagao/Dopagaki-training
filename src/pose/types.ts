// 姿勢推定の共有型。MediaPipe Tasks Vision の PoseLandmarker（BlazePose 33点）に合わせる。

export interface Landmark {
  /** 0..1 に正規化された画像座標（mirror 適用後） */
  x: number
  y: number
  /** 相対的な奥行き（腰基準） */
  z: number
  /** 0..1。その関節が見えている確信度（MediaPipe が返さない場合は 0） */
  visibility: number
}

/** 1 フレーム分の推論結果 */
export interface PoseFrame {
  landmarks: Landmark[]
  /** performance.now() ベースのタイムスタンプ(ms) */
  tMs: number
}

/** MediaPipe Pose の 33 点ランドマークのインデックス（抜粋） */
export const POSE = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

/** BlazePose の骨格接続（スケルトン描画用の点ペア） */
export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
]

// ---- Worker ⇄ メインスレッドのメッセージ ----

export type PoseDelegate = 'GPU' | 'CPU'

export interface PoseWorkerInit {
  type: 'init'
  /** wasm ファイルのあるディレクトリ（自ホスト） */
  wasmDir: string
  /** .task モデルの URL（自ホスト） */
  modelUrl: string
  delegate: PoseDelegate
  numPoses: number
}

export type PoseWorkerInMessage =
  | PoseWorkerInit
  | { type: 'frame'; bitmap: ImageBitmap; tMs: number }
  | { type: 'close' }

export type PoseWorkerOutMessage =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'result'; frame: PoseFrame; inferMs: number }
  | { type: 'dropped' }

// ---- メインスレッド側クライアント ----

export type PoseStatus = 'idle' | 'loading' | 'running' | 'error'

export interface PoseMeta {
  /** 直近推論の所要 ms */
  inferMs: number
  /** ローリング平均の推論 fps */
  inferFps: number
  /** ローリング平均のフレーム供給 fps */
  displayFps: number
  /** ワーカーが処理中で捨てたフレーム数（累計） */
  dropped: number
}

export interface PoseClientOptions {
  /** default '/models/wasm' */
  wasmDir?: string
  /** default '/models/pose_landmarker_lite.task' */
  modelUrl?: string
  /** default 'GPU'（失敗時ワーカー側で CPU フォールバック） */
  delegate?: PoseDelegate
  /** default 1 */
  numPoses?: number
  /** 前面カメラのミラー表示に合わせて x を 1-x に反転する。default true */
  mirror?: boolean
  /** 目標推論 fps（フレーム間引き）。default 24 */
  targetFps?: number
}

export interface PoseClient {
  start(video: HTMLVideoElement): void
  stop(): void
  /** 演出中などに推論 fps を下げる */
  setTargetFps(fps: number): void
  /** バックグラウンド時に true */
  setPaused(paused: boolean): void
  onResult(cb: (frame: PoseFrame) => void): () => void
  onMeta(cb: (meta: PoseMeta) => void): () => void
  onStatus(cb: (status: PoseStatus) => void): () => void
  readonly status: PoseStatus
  readonly meta: PoseMeta
  dispose(): void
}

export const DEFAULT_POSE_OPTIONS = {
  wasmDir: '/models/wasm',
  modelUrl: '/models/pose_landmarker_lite.task',
  delegate: 'GPU' as PoseDelegate,
  numPoses: 1,
  mirror: true,
  targetFps: 24,
} satisfies Required<PoseClientOptions>
