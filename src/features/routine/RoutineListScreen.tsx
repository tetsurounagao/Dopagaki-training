import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen } from '../../ui/Screen'
import type { Routine } from '../../domain/types'
import { listRoutines } from '../../store/routines'
import { getActiveSession } from '../../store/sessions'
import { isOnboarded } from '../../store/settings'

export function RoutineListScreen() {
  const navigate = useNavigate()
  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [hasActive, setHasActive] = useState(false)
  const [onboarded, setOnboarded] = useState(true)

  useEffect(() => {
    void Promise.all([listRoutines(), getActiveSession(), isOnboarded()]).then(
      ([rs, active, ob]) => {
        setRoutines(rs)
        setHasActive(!!active)
        setOnboarded(ob)
      },
    )
  }, [])

  return (
    <Screen
      title="Dopagaki"
      footer={
        <>
          {hasActive && (
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/workout')}
            >
              中断したトレーニングを続ける
            </button>
          )}
          {!onboarded && (
            <Link className="btn" to="/onboarding">
              体重を登録してはじめる
            </Link>
          )}
          <button type="button" className="btn btn--ghost" disabled>
            新規ルーティン（Phase 1）
          </button>
        </>
      }
    >
      {routines === null ? (
        <p style={{ color: 'var(--text-dim)' }}>読み込み中…</p>
      ) : routines.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>
          まだルーティンがありません。Phase 1 で登録 UI を実装します。
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
          {routines.map((r) => (
            <li
              key={r.id}
              style={{
                padding: '1rem',
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <strong>{r.name}</strong>
              <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                {r.menus.length} メニュー
              </span>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  )
}
