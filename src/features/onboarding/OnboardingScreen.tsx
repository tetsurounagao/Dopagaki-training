import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../../ui/Screen'
import { getSettings, saveSettings } from '../../store/settings'

// 自重種目（スクワット等）の実効重量に使う体重を登録する。
export function OnboardingScreen() {
  const navigate = useNavigate()
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void getSettings().then((s) => {
      if (s && s.bodyWeightKg > 0) setWeight(String(s.bodyWeightKg))
    })
  }, [])

  const value = Number(weight)
  const valid = Number.isFinite(value) && value > 0 && value < 300

  async function handleSave() {
    if (!valid) return
    setSaving(true)
    await saveSettings({ bodyWeightKg: value })
    navigate('/', { replace: true })
  }

  return (
    <Screen
      title="体重を登録"
      footer={
        <button
          type="button"
          className="btn"
          disabled={!valid || saving}
          onClick={() => void handleSave()}
        >
          保存してはじめる
        </button>
      }
    >
      <p style={{ color: 'var(--text-dim)' }}>
        自重種目（スクワットなど）のポイント計算に使います。あとから変更できます。
      </p>
      <label style={{ display: 'block', marginTop: '1.5rem' }}>
        <span style={{ display: 'block', marginBottom: '0.5rem' }}>
          体重 (kg)
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={{
            width: '100%',
            padding: '0.9rem',
            fontSize: '1.25rem',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        />
      </label>
    </Screen>
  )
}
