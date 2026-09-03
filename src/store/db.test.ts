import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { EXERCISE_MASTER } from './exercises'
import { DEFAULT_SETTINGS, isOnboarded, saveSettings } from './settings'
import { getActiveSession, persistSession } from './sessions'
import type { Routine, WorkoutSession } from '../domain/types'
import { effectiveWeightKg } from '../domain/types'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('Dexie schema', () => {
  it('種目マスタが seed される', async () => {
    const exercises = await db.exercises.toArray()
    expect(exercises).toHaveLength(EXERCISE_MASTER.length)
    expect((await db.exercises.get('squat'))?.bodyweightBased).toBe(true)
  })

  it('設定はオンボーディング前は未完了', async () => {
    expect(await isOnboarded()).toBe(false)
    await saveSettings({ bodyWeightKg: 62 })
    expect(await isOnboarded()).toBe(true)
    expect((await db.settings.get('singleton'))?.soundEnabled).toBe(
      DEFAULT_SETTINGS.soundEnabled,
    )
  })

  it('ルーティンを保存・取得できる', async () => {
    const routine: Routine = {
      id: 'r1',
      name: 'テスト',
      createdAt: Date.now(),
      menus: [
        {
          id: 'm1',
          exerciseId: 'armCurl',
          weightKg: 10,
          repsPerSet: 10,
          sets: 3,
          restSec: 60,
        },
      ],
    }
    await db.routines.put(routine)
    expect((await db.routines.get('r1'))?.menus[0]?.weightKg).toBe(10)
  })

  it('進行中セッション（finishedAt=null）を filter で拾える', async () => {
    const base: WorkoutSession = {
      id: 's1',
      routineId: 'r1',
      routineSnapshot: {
        id: 'r1',
        name: 't',
        createdAt: 0,
        menus: [],
      },
      startedAt: Date.now(),
      finishedAt: null,
      progress: {
        menuIndex: 0,
        setIndex: 0,
        repInCurrentSet: 0,
        phase: 'idle',
      },
      entries: [],
      totalVolumeKg: 0,
      totalPoints: 0,
    }
    await persistSession(base)
    await persistSession({ ...base, id: 's2', finishedAt: Date.now() })
    expect((await getActiveSession())?.id).toBe('s1')
  })
})

describe('effectiveWeightKg', () => {
  it('加重種目は登録重量', () => {
    expect(
      effectiveWeightKg(
        { weightKg: 12.5 },
        { bodyweightBased: false },
        {
          bodyWeightKg: 60,
        },
      ),
    ).toBe(12.5)
  })

  it('自重種目 かつ 重量0 なら体重', () => {
    expect(
      effectiveWeightKg(
        { weightKg: 0 },
        { bodyweightBased: true },
        {
          bodyWeightKg: 60,
        },
      ),
    ).toBe(60)
  })

  it('非自重種目 かつ 重量0 なら 0', () => {
    expect(
      effectiveWeightKg(
        { weightKg: 0 },
        { bodyweightBased: false },
        {
          bodyWeightKg: 60,
        },
      ),
    ).toBe(0)
  })
})
