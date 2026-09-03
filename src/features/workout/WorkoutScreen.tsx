import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  currentMenu,
  isFinalPlannedSet,
  plannedSets,
  targetReps,
  type WorkoutState,
} from '../../app/machine'
import { EXERCISE_BY_ID } from '../../store/exercises'
import { createEffectsController } from '../../effects'
import { useWorkout } from './useWorkout'
import { useVision } from './useVision'
import { CameraLayer } from './CameraLayer'
import { DebugHud } from './DebugHud'
import { useDebug, useSessionRecorder } from './useDebug'

const VISION_STATES = new Set([
  'exerciseSetup',
  'calibration',
  'countdown',
  'setActive',
  'setComplete',
  'rest',
  'setIntro',
])

export function WorkoutScreen() {
  const navigate = useNavigate()
  const [fx] = useState(createEffectsController)
  const fxHostRef = useRef<HTMLDivElement>(null)
  const { phase, state, effects, dispatch, tapRep } = useWorkout(fx)

  const visionActive =
    phase === 'ready' && !!state && VISION_STATES.has(state.name)
  const lowPower = state?.context.game.fever.active ?? false
  const vision = useVision({ active: visionActive, lowPower })

  const debug = useDebug()
  const recorder = useSessionRecorder(vision.onFrame)

  const handleTap = () => {
    recorder.logEvent('rep')
    tapRep()
  }

  useEffect(() => {
    const el = fxHostRef.current
    if (el) void fx.mount(el)
    return () => fx.unmount()
  }, [fx])

  useEffect(() => {
    if (phase === 'error') {
      const t = setTimeout(() => navigate('/', { replace: true }), 1500)
      return () => clearTimeout(t)
    }
  }, [phase, navigate])

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <CameraLayer
        vision={vision}
        showSkeleton={debug.enabled && debug.showSkeleton}
        minVisibility={0.5}
      />
      <div
        ref={fxHostRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
      {debug.enabled && state && (
        <DebugHud
          vision={vision}
          phase={state.name}
          reps={state.context.reps}
          minVisibility={0.5}
          showSkeleton={debug.showSkeleton}
          onToggleSkeleton={debug.toggleSkeleton}
          recording={recorder.recording}
          onToggleRecord={recorder.toggle}
        />
      )}
      {!debug.enabled && (
        <div
          aria-hidden
          onClick={debug.cornerTap}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 56,
            height: 56,
            zIndex: 6,
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        {phase === 'loading' || !state ? (
          <Centered>読み込み中…</Centered>
        ) : phase === 'error' ? (
          <Centered>読み込みに失敗しました。ホームに戻ります。</Centered>
        ) : (
          <>
            <TopBar
              onHome={() => dispatch({ type: 'GO_HOME' })}
              state={state}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <StateView
                state={state}
                effects={effects}
                tapRep={handleTap}
                dispatch={dispatch}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TopBar({
  state,
  onHome,
}: {
  state: WorkoutState
  onHome: () => void
}) {
  const ctx = state.context
  const label =
    state.name === 'result' || state.name === 'home'
      ? ''
      : `${EXERCISE_BY_ID[currentMenu(ctx).exerciseId].name} ・ セット ${
          ctx.setIndex + 1
        }/${plannedSets(ctx)}`
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        color: 'var(--text-dim)',
        fontSize: '0.85rem',
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onHome}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
        }}
      >
        中断
      </button>
    </div>
  )
}

function StateView({
  state,
  effects,
  tapRep,
  dispatch,
}: {
  state: WorkoutState
  effects: ReturnType<typeof useWorkout>['effects']
  tapRep: () => void
  dispatch: ReturnType<typeof useWorkout>['dispatch']
}) {
  const ctx = state.context

  switch (state.name) {
    case 'exerciseSetup': {
      const menu = currentMenu(ctx)
      const ex = EXERCISE_BY_ID[menu.exerciseId]
      const eff = ctx.effWeights[ctx.menuIndex] ?? 0
      return (
        <Pad>
          <h1 style={{ fontSize: '1.6rem' }}>{ex.name}</h1>
          <p style={{ color: 'var(--text-dim)' }}>
            {eff > 0 ? `${eff}kg` : '自重'} ・ {menu.repsPerSet} 回 ・{' '}
            {plannedSets(ctx)} セット
          </p>
          <p style={{ color: 'var(--text-dim)', marginTop: '1rem' }}>
            Phase 2 でここにカメラ位置ガイドが入ります。
          </p>
          <Grow />
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'SETUP_READY' })}
          >
            準備OK
          </button>
        </Pad>
      )
    }

    case 'calibration':
      return <CalibrationView dispatch={dispatch} />

    case 'countdown':
      return (
        <CountdownView
          key={`${ctx.menuIndex}-${ctx.setIndex}`}
          effects={effects}
          onDone={() => dispatch({ type: 'COUNTDOWN_DONE' })}
        />
      )

    case 'setActive': {
      const target = targetReps(ctx)
      const feverOn = ctx.game.fever.active
      return (
        <button
          type="button"
          onClick={tapRep}
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            background: feverOn
              ? 'radial-gradient(circle at 50% 40%, #3a2c00, var(--bg))'
              : 'var(--bg)',
            color: 'var(--text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1rem',
          }}
        >
          {feverOn && (
            <div
              style={{
                color: 'var(--accent)',
                fontWeight: 800,
                letterSpacing: 2,
              }}
            >
              FEVER ×2
            </div>
          )}
          <div style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1 }}>
            {ctx.reps}
            <span style={{ fontSize: '1.5rem', color: 'var(--text-dim)' }}>
              {' '}
              / {target}
            </span>
          </div>
          {ctx.bonusReps > 0 && (
            <div style={{ color: 'var(--accent)', fontWeight: 800 }}>
              BONUS +{ctx.bonusReps}
            </div>
          )}
          <Gauge ratio={Math.min(1, ctx.game.fever.gauge)} />
          <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            画面をタップしてカウント
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'SET_DONE' })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                dispatch({ type: 'SET_DONE' })
              }
            }}
            className="btn btn--ghost"
            style={{ marginTop: '1rem' }}
          >
            セット完了
          </span>
        </button>
      )
    }

    case 'setComplete':
      return (
        <Pad>
          <Centered>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>
                セット完了！
              </div>
              <div
                style={{
                  fontSize: '3rem',
                  fontWeight: 900,
                  color: 'var(--accent)',
                }}
              >
                {ctx.reps} 回
              </div>
              {ctx.hadDetectionLoss && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'center',
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() =>
                      dispatch({ type: 'CORRECT_REPS', delta: -1 })
                    }
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => dispatch({ type: 'CORRECT_REPS', delta: 1 })}
                  >
                    +1
                  </button>
                </div>
              )}
            </div>
          </Centered>
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'SET_COMPLETE_DONE' })}
          >
            続ける
          </button>
        </Pad>
      )

    case 'rest': {
      const final = isFinalPlannedSet(ctx)
      return (
        <Pad>
          <Centered>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-dim)' }}>インターバル</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900 }}>
                {ctx.restRemainingSec}
              </div>
              <div
                style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
              >
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => dispatch({ type: 'SKIP_REST' })}
                >
                  スキップ
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => dispatch({ type: 'ADD_REST', sec: 30 })}
                >
                  +30秒
                </button>
              </div>
            </div>
          </Centered>
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'AGAIN' })}
          >
            もう1セットやる
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => dispatch({ type: 'NEXT' })}
          >
            {final ? '次のメニューへ' : '次のメニューへ（このセットで終了）'}
          </button>
        </Pad>
      )
    }

    case 'setIntro':
      return (
        <Centered>
          <div
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              color: 'var(--accent)',
              textAlign: 'center',
            }}
          >
            もう1セット
            <br />
            突入
          </div>
        </Centered>
      )

    case 'result':
    case 'home':
      return <Centered>リザルトへ…</Centered>

    default:
      return null
  }
}

function CountdownView({
  effects,
  onDone,
}: {
  effects: ReturnType<typeof useWorkout>['effects']
  onDone: () => void
}) {
  const [n, setN] = useState(3)
  useEffect(() => {
    effects.countdownTick(3)
    let cur = 3
    const id = setInterval(() => {
      cur -= 1
      if (cur <= 0) {
        clearInterval(id)
        onDone()
        return
      }
      setN(cur)
      effects.countdownTick(cur)
    }, 800)
    return () => clearInterval(id)
  }, [effects, onDone])
  return (
    <Centered>
      <div
        style={{ fontSize: '6rem', fontWeight: 900, color: 'var(--accent)' }}
      >
        {n}
      </div>
    </Centered>
  )
}

function CalibrationView({
  dispatch,
}: {
  dispatch: ReturnType<typeof useWorkout>['dispatch']
}) {
  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'CALIBRATION_SKIP' }), 1200)
    return () => clearTimeout(t)
  }, [dispatch])
  return (
    <Pad>
      <Centered>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          キャリブレーション（Phase 3 で可動域を学習）
          <br />
          Phase 1 ではスキップします。
        </div>
      </Centered>
      <button
        type="button"
        className="btn"
        onClick={() => dispatch({ type: 'CALIBRATION_SKIP' })}
      >
        スキップ
      </button>
    </Pad>
  )
}

function Gauge({ ratio }: { ratio: number }) {
  return (
    <div
      style={{
        width: '70%',
        maxWidth: 260,
        height: 10,
        borderRadius: 6,
        background: 'var(--surface-2)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.round(ratio * 100)}%`,
          height: '100%',
          background: 'var(--accent)',
          transition: 'width 120ms linear',
        }}
      />
    </div>
  )
}

function Pad({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1.25rem',
      }}
    >
      {children}
    </div>
  )
}

function Grow() {
  return <div style={{ flex: 1 }} />
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      {children}
    </div>
  )
}
