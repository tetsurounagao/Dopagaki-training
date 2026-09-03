import type { Routine, WorkoutSession } from '../domain/types'
import { EXERCISE_BY_ID } from './exercises'
import { effectiveWeightKg } from '../domain/types'
import { emptyEntries } from '../app/machine'
import { db } from './db'
import { getSettings } from './settings'

/** 進行中（finishedAt === null）のセッションを返す。復帰候補。 */
export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  return db.sessions.filter((s) => s.finishedAt === null).first()
}

/** 進行中セッションの逐次保存（rep ごと・状態遷移ごとに呼ぶ想定）。 */
export async function persistSession(session: WorkoutSession): Promise<void> {
  await db.sessions.put(session)
}

/** リザルト到達時に確定。 */
export async function finalizeSession(
  session: WorkoutSession,
  finishedAt: number = Date.now(),
): Promise<void> {
  await db.sessions.put({ ...session, finishedAt })
}

export async function discardActiveSession(): Promise<void> {
  const active = await getActiveSession()
  if (active) await db.sessions.delete(active.id)
}

export async function listFinishedSessions(): Promise<WorkoutSession[]> {
  const all = await db.sessions.filter((s) => s.finishedAt !== null).toArray()
  return all.sort((a, b) => b.startedAt - a.startedAt)
}

/** メニューごとの実効重量（加重種目=登録重量 / 自重種目=登録体重） */
export async function computeEffectiveWeights(
  routine: Routine,
): Promise<number[]> {
  const settings = (await getSettings()) ?? { bodyWeightKg: 0 }
  return routine.menus.map((menu) =>
    effectiveWeightKg(menu, EXERCISE_BY_ID[menu.exerciseId], {
      bodyWeightKg: settings.bodyWeightKg,
    }),
  )
}

/** 新しい進行中セッションを作って保存し、返す。 */
export async function createSession(
  routine: Routine,
): Promise<{ session: WorkoutSession; effWeights: number[] }> {
  const effWeights = await computeEffectiveWeights(routine)
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    routineId: routine.id,
    routineSnapshot: routine,
    startedAt: Date.now(),
    finishedAt: null,
    progress: {
      menuIndex: 0,
      setIndex: 0,
      repInCurrentSet: 0,
      phase: 'exerciseSetup',
    },
    entries: emptyEntries(routine, effWeights),
    totalVolumeKg: 0,
    totalPoints: 0,
  }
  await db.sessions.put(session)
  return { session, effWeights }
}
