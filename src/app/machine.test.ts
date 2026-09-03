import { describe, expect, it } from 'vitest'
import type { Routine, WorkoutSession } from '../domain/types'
import { DEFAULT_GAME_CONFIG } from '../game/config'
import {
  buildInitialContext,
  emptyEntries,
  isFinalPlannedSet,
  type WorkoutState,
  workoutReducer,
} from './machine'

const routine: Routine = {
  id: 'r1',
  name: 'test',
  createdAt: 0,
  menus: [
    {
      id: 'm1',
      exerciseId: 'armCurl',
      weightKg: 10,
      repsPerSet: 3,
      sets: 2,
      restSec: 30,
    },
    {
      id: 'm2',
      exerciseId: 'squat',
      weightKg: 0,
      repsPerSet: 2,
      sets: 1,
      restSec: 20,
    },
  ],
}

const effWeights = [10, 60]

function freshSession(): WorkoutSession {
  return {
    id: 's1',
    routineId: 'r1',
    routineSnapshot: routine,
    startedAt: 0,
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
}

function start(): WorkoutState {
  return {
    name: 'exerciseSetup',
    context: buildInitialContext(freshSession(), effWeights),
  }
}

const cfg = DEFAULT_GAME_CONFIG
const run = (s: WorkoutState, ...evs: Parameters<typeof workoutReducer>[1][]) =>
  evs.reduce((acc, e) => workoutReducer(acc, e, cfg), s)

describe('workoutReducer フロー', () => {
  it('setup → calibration → countdown → setActive', () => {
    const s = run(
      start(),
      { type: 'SETUP_READY' },
      { type: 'CALIBRATION_SKIP' },
      { type: 'COUNTDOWN_DONE' },
    )
    expect(s.name).toBe('setActive')
    expect(s.context.reps).toBe(0)
    expect(s.context.setStartAtMs).toBeGreaterThan(0)
  })

  it('REP で reps と game が進み、目標超過で bonusReps', () => {
    let s = run(
      start(),
      { type: 'SETUP_READY' },
      { type: 'CALIBRATION_SKIP' },
      { type: 'COUNTDOWN_DONE' },
    )
    s = run(s, { type: 'REP' }, { type: 'REP' }, { type: 'REP' }) // target 3
    expect(s.context.reps).toBe(3)
    expect(s.context.bonusReps).toBe(0)
    expect(s.context.game.totalVolumeKg).toBe(30)
    s = run(s, { type: 'REP' }) // 4th = bonus
    expect(s.context.reps).toBe(4)
    expect(s.context.bonusReps).toBe(1)
  })

  it('SET_DONE → SET_COMPLETE_DONE で CompletedSet が記録され rest へ', () => {
    let s = run(
      start(),
      { type: 'SETUP_READY' },
      { type: 'CALIBRATION_SKIP' },
      { type: 'COUNTDOWN_DONE' },
      { type: 'REP' },
      { type: 'REP' },
      { type: 'SET_DONE' },
    )
    expect(s.name).toBe('setComplete')
    s = run(s, { type: 'SET_COMPLETE_DONE' })
    expect(s.name).toBe('rest')
    expect(s.context.restRemainingSec).toBe(30)
    const sets = s.context.session.entries[0]!.completedSets
    expect(sets).toHaveLength(1)
    expect(sets[0]!.reps).toBe(2)
    expect(s.context.session.totalVolumeKg).toBe(20)
  })

  it('補正は reps 表示のみ・countedBy=corrected、総量は実タップ基準', () => {
    let s = run(
      start(),
      { type: 'SETUP_READY' },
      { type: 'CALIBRATION_SKIP' },
      { type: 'COUNTDOWN_DONE' },
      { type: 'REP' },
      { type: 'REP' },
      { type: 'REP' },
      { type: 'SET_DONE' },
      { type: 'CORRECT_REPS', delta: -1 },
    )
    expect(s.context.reps).toBe(2)
    expect(s.context.countedBy).toBe('corrected')
    s = run(s, { type: 'SET_COMPLETE_DONE' })
    expect(s.context.session.entries[0]!.completedSets[0]!.reps).toBe(2)
    expect(s.context.session.entries[0]!.completedSets[0]!.countedBy).toBe(
      'corrected',
    )
    expect(s.context.session.totalVolumeKg).toBe(30) // 実タップ 3 回分
  })

  it('rest → AGAIN で setIndex++ し setIntro、INTRO_DONE で countdown', () => {
    let s = run(
      start(),
      { type: 'SETUP_READY' },
      { type: 'CALIBRATION_SKIP' },
      { type: 'COUNTDOWN_DONE' },
      { type: 'SET_DONE' },
      { type: 'SET_COMPLETE_DONE' },
    )
    expect(s.context.setIndex).toBe(0)
    s = run(s, { type: 'AGAIN' })
    expect(s.name).toBe('setIntro')
    expect(s.context.setIndex).toBe(1)
    s = run(s, { type: 'INTRO_DONE' })
    expect(s.name).toBe('countdown')
  })

  it('rest → NEXT で次メニュー、最終メニューなら result', () => {
    let s = run(
      start(),
      { type: 'SETUP_READY' },
      { type: 'CALIBRATION_SKIP' },
      { type: 'COUNTDOWN_DONE' },
      { type: 'SET_DONE' },
      { type: 'SET_COMPLETE_DONE' },
      { type: 'NEXT' },
    )
    expect(s.name).toBe('exerciseSetup')
    expect(s.context.menuIndex).toBe(1)
    s = run(
      s,
      { type: 'SETUP_READY' },
      { type: 'CALIBRATION_SKIP' },
      { type: 'COUNTDOWN_DONE' },
      { type: 'SET_DONE' },
      { type: 'SET_COMPLETE_DONE' },
      { type: 'NEXT' },
    )
    expect(s.name).toBe('result')
  })

  it('GO_HOME はどの状態からでも home へ', () => {
    const s = run(start(), { type: 'SETUP_READY' }, { type: 'GO_HOME' })
    expect(s.name).toBe('home')
  })

  it('isFinalPlannedSet: menu1 は sets=2', () => {
    const ctx = buildInitialContext(freshSession(), effWeights)
    expect(isFinalPlannedSet(ctx)).toBe(false)
    expect(isFinalPlannedSet({ ...ctx, setIndex: 1 })).toBe(true)
  })
})
