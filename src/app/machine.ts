// トレーニング実行のステートマシン（実装計画 §5）。純関数 reducer + セレクタ。
// 副作用（persistSession / effects 呼び出し）は features/workout/useWorkout.ts が担当。

import type {
  CalibrationProfile,
  CompletedSet,
  Menu,
  Routine,
  WorkoutSession,
} from '../domain/types'
import {
  type GameConfig,
  type GameSnapshot,
  initGameSnapshot,
  reduceRep,
} from '../game/types'

export type WorkoutStateName =
  | 'home'
  | 'exerciseSetup' // カメラ位置ガイド（Phase 1 は説明のみ）
  | 'calibration' // 3秒静止 + ゆっくり1rep（Phase 1 は空実装・スキップ可）
  | 'countdown' // 3..2..1
  | 'setActive' // rep カウント中
  | 'setComplete' // 賞賛 + 必要なら補正 UI
  | 'rest' // インターバル（restSec）+ 分岐ボタン
  | 'setIntro' // 「もう1セット突入」トランジション
  | 'result' // 総重量 + ポイント

export type WorkoutEvent =
  | { type: 'SETUP_READY' }
  | { type: 'CALIBRATION_DONE'; profile: CalibrationProfile }
  | { type: 'CALIBRATION_SKIP' }
  | { type: 'COUNTDOWN_DONE' }
  | { type: 'REP' }
  | { type: 'CORRECT_REPS'; delta: number }
  | { type: 'SET_DONE' }
  | { type: 'SET_COMPLETE_DONE' }
  | { type: 'REST_TICK' }
  | { type: 'SKIP_REST' }
  | { type: 'ADD_REST'; sec: number }
  | { type: 'AGAIN' } // もう1セット
  | { type: 'NEXT' } // 次メニュー or リザルト
  | { type: 'INTRO_DONE' }
  | { type: 'GO_HOME' }

export interface WorkoutContext {
  session: WorkoutSession
  menuIndex: number
  setIndex: number
  /** 現在セットの確定 rep 数 */
  reps: number
  /** 目標 rep を超えた分（BONUS 表示用） */
  bonusReps: number
  restRemainingSec: number
  /** Phase 1 は常に 'manual'。Phase 2 で 'auto' / 'corrected' */
  countedBy: CompletedSet['countedBy']
  hadDetectionLoss: boolean
  game: GameSnapshot
  /** メニュー index ごとの実効重量（開始時にスナップショット） */
  effWeights: number[]
  // --- 現在セットの集計用（countdown → setActive 進入時にリセット）---
  setStartPoints: number
  setStartVolume: number
  setFeverReps: number
  setStartAtMs: number
}

export interface WorkoutState {
  name: WorkoutStateName
  context: WorkoutContext
}

// ---- セレクタ ----

export function currentMenu(ctx: WorkoutContext): Menu {
  const m = ctx.session.routineSnapshot.menus[ctx.menuIndex]
  if (!m) throw new Error(`no menu at index ${ctx.menuIndex}`)
  return m
}

export function targetReps(ctx: WorkoutContext): number {
  return currentMenu(ctx).repsPerSet
}

export function plannedSets(ctx: WorkoutContext): number {
  return currentMenu(ctx).sets
}

export function isFinalMenu(ctx: WorkoutContext): boolean {
  return ctx.menuIndex >= ctx.session.routineSnapshot.menus.length - 1
}

/** 最終セット = 予定セット数の最後（終盤の稲妻演出はここだけ） */
export function isFinalPlannedSet(ctx: WorkoutContext): boolean {
  return ctx.setIndex >= plannedSets(ctx) - 1
}

// ---- 初期化 ----

export function buildInitialContext(
  session: WorkoutSession,
  effWeights: number[],
): WorkoutContext {
  return {
    session,
    menuIndex: 0,
    setIndex: 0,
    reps: 0,
    bonusReps: 0,
    restRemainingSec: 0,
    countedBy: 'manual',
    hadDetectionLoss: false,
    game: session.totalPoints
      ? snapshotFromSession(session)
      : initGameSnapshot(),
    effWeights,
    setStartPoints: 0,
    setStartVolume: 0,
    setFeverReps: 0,
    setStartAtMs: 0,
  }
}

function snapshotFromSession(session: WorkoutSession): GameSnapshot {
  const g = initGameSnapshot()
  return {
    ...g,
    totalPoints: session.totalPoints,
    totalVolumeKg: session.totalVolumeKg,
  }
}

/** menus と揃えた空の SessionEntry 配列 */
export function emptyEntries(routine: Routine, effWeights: number[]) {
  return routine.menus.map((menu, i) => ({
    menuId: menu.id,
    exerciseId: menu.exerciseId,
    effectiveWeightKg: effWeights[i] ?? 0,
    completedSets: [] as CompletedSet[],
  }))
}

// ---- reducer（純関数）----

export function workoutReducer(
  state: WorkoutState,
  event: WorkoutEvent,
  cfg: GameConfig,
): WorkoutState {
  const ctx = state.context

  if (event.type === 'GO_HOME') {
    return { name: 'home', context: ctx }
  }

  switch (state.name) {
    case 'exerciseSetup':
      if (event.type === 'SETUP_READY') {
        return { name: 'calibration', context: ctx }
      }
      return state

    case 'calibration':
      if (
        event.type === 'CALIBRATION_DONE' ||
        event.type === 'CALIBRATION_SKIP'
      ) {
        return { name: 'countdown', context: ctx }
      }
      return state

    case 'countdown':
      if (event.type === 'COUNTDOWN_DONE') {
        return {
          name: 'setActive',
          context: {
            ...ctx,
            reps: 0,
            bonusReps: 0,
            hadDetectionLoss: false,
            setStartPoints: ctx.game.totalPoints,
            setStartVolume: ctx.game.totalVolumeKg,
            setFeverReps: 0,
            setStartAtMs: Date.now(),
          },
        }
      }
      return state

    case 'setActive': {
      if (event.type === 'REP') {
        const eff = ctx.effWeights[ctx.menuIndex] ?? 0
        const game = reduceRep(ctx.game, { effectiveWeightKg: eff }, cfg)
        const reps = ctx.reps + 1
        const overshoot = reps > targetReps(ctx)
        return {
          name: 'setActive',
          context: {
            ...ctx,
            reps,
            bonusReps: overshoot ? ctx.bonusReps + 1 : ctx.bonusReps,
            game,
            setFeverReps: game.lastRepWasFever
              ? ctx.setFeverReps + 1
              : ctx.setFeverReps,
          },
        }
      }
      if (event.type === 'SET_DONE') {
        return { name: 'setComplete', context: ctx }
      }
      return state
    }

    case 'setComplete': {
      if (event.type === 'CORRECT_REPS') {
        return {
          name: 'setComplete',
          context: {
            ...ctx,
            reps: Math.max(0, ctx.reps + event.delta),
            countedBy: 'corrected',
          },
        }
      }
      if (event.type === 'SET_COMPLETE_DONE') {
        // このセットを記録して rest へ
        const entries = ctx.session.entries.map((e, i) =>
          i === ctx.menuIndex
            ? {
                ...e,
                completedSets: [
                  ...e.completedSets,
                  {
                    reps: ctx.reps,
                    feverReps: ctx.setFeverReps,
                    // Phase 1: ポイント/フィーバーは実タップ基準。補正は reps 表示のみ反映。
                    points: ctx.game.totalPoints - ctx.setStartPoints,
                    countedBy: ctx.countedBy,
                    durationSec: Math.max(
                      0,
                      Math.round((Date.now() - ctx.setStartAtMs) / 1000),
                    ),
                  },
                ],
              }
            : e,
        )
        const session: WorkoutSession = {
          ...ctx.session,
          entries,
          totalPoints: ctx.game.totalPoints,
          totalVolumeKg: ctx.game.totalVolumeKg,
        }
        return {
          name: 'rest',
          context: {
            ...ctx,
            session,
            countedBy: 'manual',
            restRemainingSec: currentMenu(ctx).restSec,
          },
        }
      }
      return state
    }

    case 'rest': {
      if (event.type === 'REST_TICK') {
        return {
          name: 'rest',
          context: {
            ...ctx,
            restRemainingSec: Math.max(0, ctx.restRemainingSec - 1),
          },
        }
      }
      if (event.type === 'SKIP_REST') {
        return { name: 'rest', context: { ...ctx, restRemainingSec: 0 } }
      }
      if (event.type === 'ADD_REST') {
        return {
          name: 'rest',
          context: {
            ...ctx,
            restRemainingSec: ctx.restRemainingSec + event.sec,
          },
        }
      }
      if (event.type === 'AGAIN') {
        return {
          name: 'setIntro',
          context: { ...ctx, setIndex: ctx.setIndex + 1 },
        }
      }
      if (event.type === 'NEXT') {
        if (isFinalMenu(ctx)) {
          return { name: 'result', context: ctx }
        }
        return {
          name: 'exerciseSetup',
          context: { ...ctx, menuIndex: ctx.menuIndex + 1, setIndex: 0 },
        }
      }
      return state
    }

    case 'setIntro':
      if (event.type === 'INTRO_DONE') {
        return { name: 'countdown', context: ctx }
      }
      return state

    default:
      return state
  }
}
