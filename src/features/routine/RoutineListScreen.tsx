import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen } from '../../ui/Screen'
import type { Routine } from '../../domain/types'
import { deleteRoutine, listRoutines } from '../../store/routines'
import { getActiveSession } from '../../store/sessions'
import { isOnboarded } from '../../store/settings'

export function RoutineListScreen() {
  const navigate = useNavigate()
  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [hasActive, setHasActive] = useState(false)
  const [onboarded, setOnboarded] = useState(true)

  const load = useCallback(() => {
    void Promise.all([listRoutines(), getActiveSession(), isOnboarded()]).then(
      ([rs, active, ob]) => {
        setRoutines(rs)
        setHasActive(!!active)
        setOnboarded(ob)
      },
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(r: Routine) {
    if (!window.confirm(`「${r.name}」を削除しますか？`)) return
    await deleteRoutine(r.id)
    load()
  }

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
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/routine/new')}
          >
            新規ルーティン
          </button>
        </>
      }
    >
      {routines === null ? (
        <p style={{ color: 'var(--text-dim)' }}>読み込み中…</p>
      ) : routines.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>
          まだルーティンがありません。「新規ルーティン」から登録できます。
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
          {routines.map((r) => (
            <li
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.85rem 1rem',
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{r.name}</strong>
                <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                  {r.menus.length} メニュー
                </span>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ minHeight: 40, padding: '0.45rem 0.9rem' }}
                onClick={() => navigate(`/routine/${r.id}`)}
              >
                編集
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ minHeight: 40, padding: '0.45rem 0.9rem' }}
                onClick={() => void handleDelete(r)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  )
}
