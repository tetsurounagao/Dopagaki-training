import type { Routine } from '../domain/types'
import { db } from './db'

export function listRoutines(): Promise<Routine[]> {
  return db.routines.orderBy('createdAt').reverse().toArray()
}

export function getRoutine(id: string): Promise<Routine | undefined> {
  return db.routines.get(id)
}

export async function saveRoutine(routine: Routine): Promise<void> {
  await db.routines.put(routine)
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id)
}

// TODO(Phase 1): 登録 UI 側でバリデーション（menus 非空・reps/sets >= 1 など）。
