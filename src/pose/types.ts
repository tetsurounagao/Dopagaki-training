// 姿勢推定の共有型（Phase 2 で MediaPipe と接続する際の I/F）。
// 現状は形だけ。MediaPipe Tasks Vision の NormalizedLandmark に合わせている。

export interface Landmark {
  /** 0..1 に正規化された画像座標 */
  x: number
  y: number
  /** 相対的な奥行き（腰基準） */
  z: number
  /** 0..1。その関節が見えている確信度 */
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
