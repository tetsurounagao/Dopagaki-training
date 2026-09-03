import type { Menu, Routine } from '../domain/types'
import { db } from './db'
import { EXERCISE_BY_ID } from './exercises'

export function listRoutines(): Promise<Routine[]> {
  return db.routines.orderBy('createdAt').reverse().toArray()
}

export function getRoutine(id: string): Promise<Routine | undefined> {
  return db.routines.get(id)
}

/** 新規メニューの初期値。 */
export function newMenu(): Menu {
  return {
    id: crypto.randomUUID(),
    exerciseId: 'armCurl',
    weightKg: 0,
    repsPerSet: 10,
    sets: 3,
    restSec: 60,
  }
}

/** 新規ルーティンの初期値（メニュー1件付き）。 */
export function newRoutine(): Routine {
  return {
    id: crypto.randomUUID(),
    name: '',
    createdAt: Date.now(),
    menus: [newMenu()],
  }
}

/**
 * ルーティンの妥当性を検証する。
 * 返り値は人間可読なエラーメッセージの配列。空配列なら OK。
 *
 * ルール:
 *  - 名前が非空（前後空白を除く）
 *  - メニューが1件以上
 *  - 各メニュー: 種目が有効 / weightKg >= 0 かつ 0.5 の倍数 /
 *    repsPerSet >= 1（整数）/ sets >= 1（整数）/ restSec >= 0
 */
export function validateRoutine(routine: Routine): string[] {
  const errors: string[] = []

  if (routine.name.trim() === '') {
    errors.push('ルーティン名を入力してください')
  }
  if (routine.menus.length === 0) {
    errors.push('メニューを1件以上追加してください')
  }

  routine.menus.forEach((menu, i) => {
    const label = `メニュー${i + 1}`

    if (!EXERCISE_BY_ID[menu.exerciseId]) {
      errors.push(`${label}: 種目を選択してください`)
    }
    if (!Number.isFinite(menu.weightKg) || menu.weightKg < 0) {
      errors.push(`${label}: 重量は0以上の数値で入力してください`)
    } else if (!Number.isInteger(menu.weightKg * 2)) {
      errors.push(`${label}: 重量は0.5kg刻みで入力してください`)
    }
    if (!Number.isInteger(menu.repsPerSet) || menu.repsPerSet < 1) {
      errors.push(`${label}: 1セットの回数は1以上の整数で入力してください`)
    }
    if (!Number.isInteger(menu.sets) || menu.sets < 1) {
      errors.push(`${label}: セット数は1以上の整数で入力してください`)
    }
    if (!Number.isFinite(menu.restSec) || menu.restSec < 0) {
      errors.push(`${label}: レスト秒数は0以上で入力してください`)
    }
  })

  return errors
}

export async function saveRoutine(routine: Routine): Promise<void> {
  const errors = validateRoutine(routine)
  if (errors.length > 0) {
    throw new Error(`ルーティンが不正です: ${errors.join(' / ')}`)
  }
  await db.routines.put(routine)
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id)
}
