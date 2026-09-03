import type { CalibrationProfile, ExerciseId } from '../domain/types'
import { db } from './db'

export function getCalibration(
  exerciseId: ExerciseId,
): Promise<CalibrationProfile | undefined> {
  return db.calibrations.get(exerciseId)
}

export async function saveCalibration(
  profile: CalibrationProfile,
): Promise<void> {
  await db.calibrations.put(profile)
}

export async function isCalibrated(exerciseId: ExerciseId): Promise<boolean> {
  return (await db.calibrations.get(exerciseId)) !== undefined
}

// TODO(Phase 3): RepDetector.finalizeCalibration() の戻り値をそのまま保存する。
