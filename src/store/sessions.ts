import type { WorkoutSession } from '../domain/types'
import { db } from './db'

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

export function listFinishedSessions(): Promise<WorkoutSession[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray()
}

// TODO(Phase 1): totalVolumeKg / totalPoints の集計は game/PointsEngine 側で行い、
// ここでは保存だけを担う。
