import type { UserSettings } from '../domain/types'
import { db } from './db'

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'singleton',
  bodyWeightKg: 0,
  soundEnabled: true,
  voiceCountEnabled: true,
}

export async function getSettings(): Promise<UserSettings | undefined> {
  return db.settings.get('singleton')
}

export async function saveSettings(
  patch: Partial<Omit<UserSettings, 'id'>>,
): Promise<void> {
  const current = (await getSettings()) ?? DEFAULT_SETTINGS
  await db.settings.put({ ...current, ...patch, id: 'singleton' })
}

/** オンボーディング（体重登録）が済んでいるか */
export async function isOnboarded(): Promise<boolean> {
  const s = await getSettings()
  return !!s && s.bodyWeightKg > 0
}
