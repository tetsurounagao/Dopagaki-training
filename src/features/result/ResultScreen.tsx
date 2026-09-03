import { Link } from 'react-router-dom'
import { Screen } from '../../ui/Screen'

// Phase 1 で 総重量（Σ rep×実効重量）と ポイント（フィーバー倍率込み）を表示する。
export function ResultScreen() {
  return (
    <Screen
      title="リザルト"
      footer={
        <Link className="btn" to="/">
          ホームへ
        </Link>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <Stat label="総重量" value="—" unit="kg" />
        <Stat label="ポイント" value="—" />
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 24 }}>
        Phase 1 で実データを表示。
      </p>
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
