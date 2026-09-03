import type { Exercise, ExerciseId } from '../domain/types'

// アプリ同梱の種目マスタ。初回起動時に Dexie の exercises テーブルへ seed する（db.ts の populate）。
export const EXERCISE_MASTER: Exercise[] = [
  {
    id: 'armCurl',
    name: 'アームカール',
    detector: 'armCurl',
    mode: 'single',
    bodyweightBased: false,
  },
  {
    id: 'shoulderPress',
    name: 'ショルダープレス',
    detector: 'shoulderPress',
    mode: 'both',
    bodyweightBased: false,
  },
  {
    id: 'squat',
    name: 'スクワット',
    detector: 'squat',
    mode: 'both',
    bodyweightBased: true,
  },
  {
    id: 'sideRaise',
    name: 'サイドレイズ',
    detector: 'sideRaise',
    mode: 'both',
    bodyweightBased: false,
  },
  {
    id: 'other',
    name: 'その他（タップのみ）',
    detector: 'none',
    mode: 'both',
    bodyweightBased: false,
  },
]

export const EXERCISE_BY_ID: Record<ExerciseId, Exercise> = Object.fromEntries(
  EXERCISE_MASTER.map((e) => [e.id, e]),
) as Record<ExerciseId, Exercise>
