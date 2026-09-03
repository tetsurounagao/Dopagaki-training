import Dexie, { type Table } from 'dexie'
import type {
  CalibrationProfile,
  Exercise,
  Routine,
  UserSettings,
  WorkoutSession,
} from '../domain/types'
import { EXERCISE_MASTER } from './exercises'

// 端末内のみ。バックエンド・同期なし（CLAUDE.md）。
export class DopagakiDB extends Dexie {
  exercises!: Table<Exercise, string>
  settings!: Table<UserSettings, string>
  calibrations!: Table<CalibrationProfile, string>
  routines!: Table<Routine, string>
  sessions!: Table<WorkoutSession, string>

  constructor() {
    super('dopagaki')
    this.version(1).stores({
      exercises: 'id',
      settings: 'id',
      calibrations: 'exerciseId',
      routines: 'id, createdAt',
      // finishedAt === null が「進行中」= 復帰対象（常に高々1件）。
      // Dexie は null 値を索引しないため finishedAt はインデックスにせず filter で拾う。
      sessions: 'id, routineId, startedAt',
    })

    this.on('populate', () => {
      this.exercises.bulkAdd(EXERCISE_MASTER)
    })
  }
}

export const db = new DopagakiDB()

/**
 * 既存 DB（populate 済みだが後から種目マスタを増やした場合）向けに、
 * 起動時に不足分だけ埋める。
 */
export async function ensureExercisesSeeded(): Promise<void> {
  const count = await db.exercises.count()
  if (count < EXERCISE_MASTER.length) {
    await db.exercises.bulkPut(EXERCISE_MASTER)
  }
}
