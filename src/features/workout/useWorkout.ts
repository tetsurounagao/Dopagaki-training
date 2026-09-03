import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  buildInitialContext,
  isFinalPlannedSet,
  targetReps,
  type WorkoutEvent,
  type WorkoutState,
  workoutReducer,
} from '../../app/machine'
import { DEFAULT_GAME_CONFIG } from '../../game/config'
import { gaugeRatio } from '../../game/types'
import type { EffectsController } from '../../effects/types'
import { nullEffects } from '../../effects/types'
import { getRoutine } from '../../store/routines'
import {
  createSession,
  discardActiveSession,
  finalizeSession,
  getActiveSession,
  persistSession,
} from '../../store/sessions'

const cfg = DEFAULT_GAME_CONFIG
const IDLE_AUTO_DONE_MS = 4000
const SET_COMPLETE_AUTO_MS = 2600

type LoadPhase = 'loading' | 'ready' | 'error'

export function useWorkout(effects: EffectsController = nullEffects) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<LoadPhase>('loading')
  const [state, setState] = useState<WorkoutState | null>(null)
  const stateRef = useRef<WorkoutState | null>(null)
  const lastRepAt = useRef(0)
  const finalized = useRef(false)

  useEffect(() => {
    stateRef.current = state
  })

  // --- 初期化（新規 or 復帰）---
  useEffect(() => {
    let cancelled = false
    const routineId = params.get('routine')
    const resume = params.get('resume')

    void (async () => {
      try {
        if (resume) {
          const active = await getActiveSession()
          if (!active) {
            navigate('/', { replace: true })
            return
          }
          const effWeights = active.entries.map((e) => e.effectiveWeightKg)
          const ctx = buildInitialContext(active, effWeights)
          ctx.menuIndex = Math.min(
            active.progress.menuIndex,
            active.routineSnapshot.menus.length - 1,
          )
          ctx.setIndex = active.progress.setIndex
          if (!cancelled) {
            setState({ name: 'exerciseSetup', context: ctx })
            setPhase('ready')
          }
          return
        }
        if (!routineId) {
          navigate('/', { replace: true })
          return
        }
        const routine = await getRoutine(routineId)
        if (!routine || routine.menus.length === 0) {
          navigate('/', { replace: true })
          return
        }
        await discardActiveSession()
        const { session, effWeights } = await createSession(routine)
        if (!cancelled) {
          setState({
            name: 'exerciseSetup',
            context: buildInitialContext(session, effWeights),
          })
          setPhase('ready')
        }
      } catch {
        if (!cancelled) setPhase('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params, navigate])

  const dispatch = useCallback(
    (event: WorkoutEvent) => {
      const prev = stateRef.current
      if (!prev) return
      const next = workoutReducer(prev, event, cfg)
      stateRef.current = next
      runEffects(prev, next, event, effects)
      setState(next)
    },
    [effects],
  )

  // --- 逐次保存 ---
  useEffect(() => {
    if (!state || state.name === 'home') return
    const { context: ctx } = state
    void persistSession({
      ...ctx.session,
      progress: {
        menuIndex: ctx.menuIndex,
        setIndex: ctx.setIndex,
        repInCurrentSet: ctx.reps,
        phase: state.name,
      },
      totalPoints: ctx.game.totalPoints,
      totalVolumeKg: ctx.game.totalVolumeKg,
    })
  }, [state])

  // --- home / result への遷移 ---
  useEffect(() => {
    if (!state) return
    if (state.name === 'home') {
      navigate('/', { replace: true })
      return
    }
    if (state.name === 'result' && !finalized.current) {
      finalized.current = true
      const ctx = state.context
      void finalizeSession({
        ...ctx.session,
        totalPoints: ctx.game.totalPoints,
        totalVolumeKg: ctx.game.totalVolumeKg,
      }).then(() =>
        navigate(`/result?session=${ctx.session.id}`, { replace: true }),
      )
    }
  }, [state, navigate])

  // --- 状態ごとのタイマー（countdown は CountdownView が自前で持つ）---
  useEffect(() => {
    if (!state) return
    switch (state.name) {
      case 'setActive': {
        lastRepAt.current = Date.now()
        const id = setInterval(() => {
          const s = stateRef.current
          if (
            s?.name === 'setActive' &&
            Date.now() - lastRepAt.current > IDLE_AUTO_DONE_MS &&
            s.context.reps >= targetReps(s.context)
          ) {
            dispatch({ type: 'SET_DONE' })
          }
        }, 500)
        return () => clearInterval(id)
      }
      case 'setComplete': {
        const id = setTimeout(
          () => dispatch({ type: 'SET_COMPLETE_DONE' }),
          SET_COMPLETE_AUTO_MS,
        )
        return () => clearTimeout(id)
      }
      case 'rest': {
        const id = setInterval(() => dispatch({ type: 'REST_TICK' }), 1000)
        return () => clearInterval(id)
      }
      case 'setIntro': {
        let done = false
        void effects.playSetIntro().then(() => {
          if (!done) dispatch({ type: 'INTRO_DONE' })
        })
        return () => {
          done = true
        }
      }
      default:
        return
    }
  }, [state, dispatch, effects])

  const tapRep = useCallback(() => {
    lastRepAt.current = Date.now()
    dispatch({ type: 'REP' })
  }, [dispatch])

  return { phase, state, effects, dispatch, tapRep }
}

function runEffects(
  prev: WorkoutState,
  next: WorkoutState,
  ev: WorkoutEvent,
  fx: EffectsController,
) {
  if (
    ev.type === 'REP' &&
    prev.name === 'setActive' &&
    next.name === 'setActive'
  ) {
    const c = next.context
    const target = targetReps(c)
    fx.popRep(c.reps, { fever: c.game.lastRepWasFever, bonus: c.reps > target })
    fx.voiceCount(c.reps)
    fx.setGauge(gaugeRatio(c.game, cfg))
    if (isFinalPlannedSet(c)) fx.finalSetTail(Math.max(0, target - c.reps))
    if (!prev.context.game.fever.active && c.game.fever.active) fx.startFever()
    if (prev.context.game.fever.active && !c.game.fever.active) fx.endFever()
  }
  if (next.name === 'setComplete' && prev.name !== 'setComplete') {
    fx.setCompleteCelebration()
  }
}
