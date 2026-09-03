import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Screen } from '../../ui/Screen'
import type { WorkoutSession } from '../../domain/types'
import { EXERCISE_BY_ID } from '../../store/exercises'
import { db } from '../../store/db'

// 総重量（Σ rep×実効重量、フィーバー非依存）と ポイント（フィーバー倍率込み）を表示。
export function ResultScreen() {
  const [params] = useSearchParams()
  const id = params.get('session')
  const [session, setSession] = useState<WorkoutSession | null | undefined>(
    () => (id ? undefined : null),
  )

  useEffect(() => {
    if (!id) return
    void db.sessions.get(id).then((s) => setSession(s ?? null))
  }, [id])

  const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP')

  return (
    <Screen
      title="リザルト"
      footer={
        <Link className="btn" to="/">
          ホームへ
        </Link>
      }
    >
      {session === undefined ? (
        <p style={{ color: 'var(--text-dim)' }}>読み込み中…</p>
      ) : session === null ? (
        <p style={{ color: 'var(--text-dim)' }}>セッションが見つかりません。</p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 16 }}>
            <Stat label="総重量" value={fmt(session.totalVolumeKg)} unit="kg" />
            <Stat label="ポイント" value={fmt(session.totalPoints)} />
          </div>
          <h2 style={{ fontSize: '1rem', margin: '1.5rem 0 0.5rem' }}>
            種目別
          </h2>
          <ul
            style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}
          >
            {session.entries.map((e) => {
              const reps = e.completedSets.reduce((a, s) => a + s.reps, 0)
              const sets = e.completedSets.length
              if (sets === 0) return null
              return (
                <li
                  key={e.menuId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span>{EXERCISE_BY_ID[e.exerciseId].name}</span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    {e.effectiveWeightKg > 0
                      ? `${e.effectiveWeightKg}kg × `
                      : ''}
                    {reps}回 / {sets}セット
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Screen>
  )
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <div
      style={{
        padding: '1.25rem',
        borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800 }}>
        {value}
        {unit && (
          <span style={{ fontSize: '1rem', marginLeft: 4 }}>{unit}</span>
        )}
      </div>
    </div>
  )
}
