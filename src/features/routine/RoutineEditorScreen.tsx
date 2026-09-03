import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Screen } from '../../ui/Screen'
import type { ExerciseId, Menu, Routine } from '../../domain/types'
import { EXERCISE_MASTER } from '../../store/exercises'
import {
  getRoutine,
  newMenu,
  newRoutine,
  saveRoutine,
  validateRoutine,
} from '../../store/routines'

type Status = 'loading' | 'ready' | 'notfound'

// ルーティンの新規作成（/routine/new）と編集（/routine/:id）を兼ねる画面。
export function RoutineEditorScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  // 新規（/routine/new）は初期値をそのまま持つ。編集（/routine/:id）は effect で読み込む。
  const [routine, setRoutine] = useState<Routine | null>(() =>
    id ? null : newRoutine(),
  )
  const [status, setStatus] = useState<Status>(id ? 'loading' : 'ready')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void getRoutine(id).then((r) => {
      if (cancelled) return
      if (r) {
        setRoutine(r)
        setStatus('ready')
      } else {
        setStatus('notfound')
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  function updateMenu(menuId: string, patch: Partial<Menu>) {
    setRoutine((r) =>
      r
        ? {
            ...r,
            menus: r.menus.map((m) =>
              m.id === menuId ? { ...m, ...patch } : m,
            ),
          }
        : r,
    )
  }

  function addMenu() {
    setRoutine((r) => (r ? { ...r, menus: [...r.menus, newMenu()] } : r))
  }

  function removeMenu(menuId: string) {
    setRoutine((r) =>
      r ? { ...r, menus: r.menus.filter((m) => m.id !== menuId) } : r,
    )
  }

  function moveMenu(index: number, dir: -1 | 1) {
    setRoutine((r) => {
      if (!r) return r
      const target = index + dir
      if (target < 0 || target >= r.menus.length) return r
      const menus = r.menus.slice()
      const a = menus[index]
      const b = menus[target]
      if (!a || !b) return r
      menus[index] = b
      menus[target] = a
      return { ...r, menus }
    })
  }

  async function handleSave() {
    if (!routine) return
    const errs = validateRoutine(routine)
    setErrors(errs)
    if (errs.length > 0) return
    setSaving(true)
    try {
      await saveRoutine(routine)
      navigate('/', { replace: true })
    } catch (e) {
      setSaving(false)
      setErrors([e instanceof Error ? e.message : String(e)])
    }
  }

  if (status === 'loading' || !routine) {
    return (
      <Screen title="ルーティン">
        <p style={{ color: 'var(--text-dim)' }}>読み込み中…</p>
      </Screen>
    )
  }

  if (status === 'notfound') {
    return (
      <Screen
        title="ルーティン"
        footer={
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/', { replace: true })}
          >
            一覧へ戻る
          </button>
        }
      >
        <p style={{ color: 'var(--text-dim)' }}>
          ルーティンが見つかりませんでした。
        </p>
      </Screen>
    )
  }

  const current = routine

  return (
    <Screen
      title={id ? 'ルーティンを編集' : '新規ルーティン'}
      footer={
        <>
          <button
            type="button"
            className="btn"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            保存
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/')}
          >
            キャンセル
          </button>
        </>
      }
    >
      <label style={labelStyle}>
        <span style={labelTextStyle}>ルーティン名</span>
        <input
          type="text"
          value={current.name}
          placeholder="例: 上半身の日"
          onChange={(e) =>
            setRoutine((r) => (r ? { ...r, name: e.target.value } : r))
          }
          style={inputStyle}
        />
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '1.5rem 0 0.75rem',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>メニュー</h2>
        <button
          type="button"
          className="btn btn--ghost"
          style={smallBtnStyle}
          onClick={addMenu}
        >
          + 追加
        </button>
      </div>

      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: 12,
        }}
      >
        {current.menus.map((menu, i) => (
          <li key={menu.id} style={cardStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <strong>メニュー {i + 1}</strong>
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={iconBtnStyle}
                  disabled={i === 0}
                  aria-label="上へ移動"
                  onClick={() => moveMenu(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={iconBtnStyle}
                  disabled={i === current.menus.length - 1}
                  aria-label="下へ移動"
                  onClick={() => moveMenu(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={iconBtnStyle}
                  aria-label="削除"
                  onClick={() => removeMenu(menu.id)}
                >
                  ✕
                </button>
              </span>
            </div>

            <label style={labelStyle}>
              <span style={labelTextStyle}>種目</span>
              <select
                value={menu.exerciseId}
                onChange={(e) =>
                  updateMenu(menu.id, {
                    exerciseId: e.target.value as ExerciseId,
                  })
                }
                style={inputStyle}
              >
                {EXERCISE_MASTER.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 10,
              }}
            >
              <NumberField
                label="重量 (kg)"
                value={menu.weightKg}
                step={0.5}
                min={0}
                onChange={(n) => updateMenu(menu.id, { weightKg: n })}
              />
              <NumberField
                label="レスト (秒)"
                value={menu.restSec}
                min={0}
                onChange={(n) => updateMenu(menu.id, { restSec: n })}
              />
              <NumberField
                label="1セットの回数"
                value={menu.repsPerSet}
                min={1}
                onChange={(n) => updateMenu(menu.id, { repsPerSet: n })}
              />
              <NumberField
                label="セット数"
                value={menu.sets}
                min={1}
                onChange={(n) => updateMenu(menu.id, { sets: n })}
              />
            </div>
          </li>
        ))}
      </ol>

      {errors.length > 0 && (
        <ul
          style={{
            listStyle: 'disc',
            margin: '1.25rem 0 0',
            paddingLeft: '1.25rem',
            color: 'var(--danger)',
          }}
        >
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
    </Screen>
  )
}

function NumberField({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string
  value: number
  step?: number
  min?: number
  onChange: (n: number) => void
}) {
  return (
    <label style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step ?? 1}
        min={min ?? 0}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) =>
          onChange(e.target.value === '' ? NaN : Number(e.target.value))
        }
        style={inputStyle}
      />
    </label>
  )
}

const labelStyle: CSSProperties = { display: 'block' }

const labelTextStyle: CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  fontSize: '0.85rem',
  color: 'var(--text-dim)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  fontSize: '1rem',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
}

const cardStyle: CSSProperties = {
  padding: '1rem',
  borderRadius: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
}

const smallBtnStyle: CSSProperties = {
  minHeight: 40,
  padding: '0.45rem 0.9rem',
}

const iconBtnStyle: CSSProperties = {
  minHeight: 36,
  minWidth: 36,
  padding: '0.3rem 0.5rem',
}
