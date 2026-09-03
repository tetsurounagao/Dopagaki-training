// ドメインモデル。実装計画.md §4 と一致させる。
// ここは Phase 1 の並列作業の前提となる共有インターフェース。変更時は計画・CLAUDE.md も更新する。

export type ExerciseId =
  'armCurl' | 'shoulderPress' | 'squat' | 'sideRaise' | 'other'

export type DetectorKey =
  'armCurl' | 'shoulderPress' | 'squat' | 'sideRaise' | 'none' // 'none' = タップカウントのみ

/** アプリ同梱の種目マスタ */
export interface Exercise {
  id: ExerciseId
  name: string
  detector: DetectorKey
  mode: 'both' | 'single'
  /** true かつ Menu.weightKg が 0 のとき、UserSettings.bodyWeightKg を実効重量に使う */
  bodyweightBased: boolean
}

/** ユーザー設定（単一レコード id='singleton'） */
export interface UserSettings {
  id: 'singleton'
  bodyWeightKg: number
  soundEnabled: boolean
  voiceCountEnabled: boolean
}

/** キャリブレーション結果（種目ごと・端末ごとに1件、キー = exerciseId） */
export interface CalibrationProfile {
  exerciseId: ExerciseId
  /** detector が学習した値（可動域の上端/下端角度など。実装依存の JSON） */
  params: Record<string, number>
  updatedAt: number
}

/** ルーティン（ユーザー作成） */
export interface Routine {
  id: string
  name: string
  createdAt: number
  menus: Menu[]
}

export interface Menu {
  id: string
  exerciseId: ExerciseId
  /** 0 かつ種目が bodyweightBased なら UserSettings.bodyWeightKg を使用 */
  weightKg: number
  repsPerSet: number
  sets: number
  restSec: number
}

/** 実施セッション（履歴 & 進行中） */
export interface WorkoutSession {
  id: string
  routineId: string
  /** 実施時点のルーティン内容を丸ごとスナップショット */
  routineSnapshot: Routine
  startedAt: number
  /** null = 進行中（復帰対象。常に高々1件） */
  finishedAt: number | null
  progress: SessionProgress
  entries: SessionEntry[]
  /** Σ(reps × effectiveWeightKg)。フィーバー倍率の影響を受けない */
  totalVolumeKg: number
  /** Σ(reps × effectiveWeightKg × フィーバー倍率)。通常 1x / フィーバー中 2x */
  totalPoints: number
}

export interface SessionProgress {
  menuIndex: number
  setIndex: number
  repInCurrentSet: number
  /** ステートマシンの状態名 */
  phase: string
}

export interface SessionEntry {
  menuId: string
  exerciseId: ExerciseId
  /** 実際に計上した重量（自重なら体重をスナップショット） */
  effectiveWeightKg: number
  completedSets: CompletedSet[]
}

export interface CompletedSet {
  reps: number
  /** うちフィーバー中だった rep 数 */
  feverReps: number
  /** このセットで得たポイント（倍率適用済み） */
  points: number
  countedBy: 'auto' | 'manual' | 'corrected'
  durationSec: number
}

export const FEVER_MULTIPLIER = 2

/** 実効重量を求める */
export function effectiveWeightKg(
  menu: Pick<Menu, 'weightKg'>,
  exercise: Pick<Exercise, 'bodyweightBased'>,
  settings: Pick<UserSettings, 'bodyWeightKg'>,
): number {
  if (menu.weightKg > 0) return menu.weightKg
  return exercise.bodyweightBased ? settings.bodyWeightKg : 0
}
