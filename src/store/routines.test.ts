import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  deleteRoutine,
  getRoutine,
  listRoutines,
  newMenu,
  newRoutine,
  saveRoutine,
  validateRoutine,
} from './routines'
import type { Routine } from '../domain/types'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

/** バリデーションを通る最小のルーティンを作る。 */
function validRoutine(overrides: Partial<Routine> = {}): Routine {
  const r = newRoutine()
  r.name = 'テストルーティン'
  return { ...r, ...overrides }
}

describe('newRoutine / newMenu', () => {
  it('newRoutine はメニュー1件付きの妥当な形（名前だけ空）', () => {
    const r = newRoutine()
    expect(r.menus).toHaveLength(1)
    expect(typeof r.id).toBe('string')
    expect(r.id.length).toBeGreaterThan(0)
    expect(validateRoutine(r)).toEqual(['ルーティン名を入力してください'])
  })

  it('newMenu は一意な id を持つ', () => {
    expect(newMenu().id).not.toBe(newMenu().id)
  })
})

describe('CRUD ラウンドトリップ', () => {
  it('save → list → get → delete', async () => {
    const r = validRoutine({ id: 'r1', createdAt: 1000 })
    await saveRoutine(r)

    expect(await getRoutine('r1')).toEqual(r)

    const list = await listRoutines()
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('r1')

    await deleteRoutine('r1')
    expect(await getRoutine('r1')).toBeUndefined()
    expect(await listRoutines()).toHaveLength(0)
  })

  it('list は createdAt の新しい順', async () => {
    await saveRoutine(validRoutine({ id: 'old', createdAt: 1 }))
    await saveRoutine(validRoutine({ id: 'new', createdAt: 2 }))
    const list = await listRoutines()
    expect(list.map((r) => r.id)).toEqual(['new', 'old'])
  })

  it('saveRoutine は不正なルーティンを弾く（throw）', async () => {
    await expect(saveRoutine(validRoutine({ name: '' }))).rejects.toThrow()
    expect(await listRoutines()).toHaveLength(0)
  })
})

describe('validateRoutine', () => {
  it('妥当なルーティンは空配列', () => {
    expect(validateRoutine(validRoutine())).toEqual([])
  })

  it('名前が空', () => {
    expect(validateRoutine(validRoutine({ name: '   ' }))).toContain(
      'ルーティン名を入力してください',
    )
  })

  it('メニューが0件', () => {
    const errors = validateRoutine(validRoutine({ menus: [] }))
    expect(errors).toEqual(['メニューを1件以上追加してください'])
  })

  it('repsPerSet が 1 未満', () => {
    const errors = validateRoutine(
      validRoutine({ menus: [{ ...newMenu(), repsPerSet: 0 }] }),
    )
    expect(errors).toContain(
      'メニュー1: 1セットの回数は1以上の整数で入力してください',
    )
  })

  it('repsPerSet が非整数', () => {
    const errors = validateRoutine(
      validRoutine({ menus: [{ ...newMenu(), repsPerSet: 1.5 }] }),
    )
    expect(errors).toContain(
      'メニュー1: 1セットの回数は1以上の整数で入力してください',
    )
  })

  it('sets が 1 未満', () => {
    const errors = validateRoutine(
      validRoutine({ menus: [{ ...newMenu(), sets: 0 }] }),
    )
    expect(errors).toContain(
      'メニュー1: セット数は1以上の整数で入力してください',
    )
  })

  it('restSec が負', () => {
    const errors = validateRoutine(
      validRoutine({ menus: [{ ...newMenu(), restSec: -1 }] }),
    )
    expect(errors).toContain('メニュー1: レスト秒数は0以上で入力してください')
  })

  it('weightKg が負', () => {
    const errors = validateRoutine(
      validRoutine({ menus: [{ ...newMenu(), weightKg: -0.5 }] }),
    )
    expect(errors).toContain('メニュー1: 重量は0以上の数値で入力してください')
  })

  it('weightKg が 0.5 の倍数でない', () => {
    const errors = validateRoutine(
      validRoutine({ menus: [{ ...newMenu(), weightKg: 10.25 }] }),
    )
    expect(errors).toContain('メニュー1: 重量は0.5kg刻みで入力してください')
  })

  it('weightKg = 0 と 0.5 の倍数は OK', () => {
    expect(
      validateRoutine(validRoutine({ menus: [{ ...newMenu(), weightKg: 0 }] })),
    ).toEqual([])
    expect(
      validateRoutine(
        validRoutine({ menus: [{ ...newMenu(), weightKg: 12.5 }] }),
      ),
    ).toEqual([])
  })

  it('エラーメッセージはメニュー番号付き（複数メニュー）', () => {
    const errors = validateRoutine(
      validRoutine({
        menus: [newMenu(), { ...newMenu(), sets: 0 }],
      }),
    )
    expect(errors).toContain(
      'メニュー2: セット数は1以上の整数で入力してください',
    )
  })
})
