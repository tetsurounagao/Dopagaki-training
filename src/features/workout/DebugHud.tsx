import type { Vision } from './useVision'

interface DebugHudProps {
  vision: Vision
  phase: string
  reps: number
  minVisibility: number
  showSkeleton: boolean
  onToggleSkeleton: () => void
  recording: boolean
  onToggleRecord: () => void
}

export function DebugHud({
  vision,
  phase,
  reps,
  minVisibility,
  showSkeleton,
  onToggleSkeleton,
  recording,
  onToggleRecord,
}: DebugHudProps) {
  const { meta, cameraStatus, poseStatus } = vision
  const row = (k: string, v: string | number) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ opacity: 0.7 }}>{k}</span>
      <span>{v}</span>
    </div>
  )
  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(8px + env(safe-area-inset-top))',
        left: 8,
        zIndex: 5,
        width: 200,
        padding: '8px 10px',
        borderRadius: 8,
        background: 'rgba(0,0,0,0.72)',
        color: '#e8e8ee',
        font: '11px/1.5 ui-monospace, Menlo, monospace',
        pointerEvents: 'auto',
      }}
    >
      {row('camera', cameraStatus)}
      {row('pose', poseStatus)}
      {row('display fps', meta.displayFps.toFixed(1))}
      {row('infer fps', meta.inferFps.toFixed(1))}
      {row('infer ms', meta.inferMs.toFixed(1))}
      {row('dropped', meta.dropped)}
      {row('min vis', minVisibility.toFixed(2))}
      {row('phase', phase)}
      {row('reps', reps)}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button type="button" onClick={onToggleSkeleton} style={hudBtn}>
          skeleton {showSkeleton ? 'on' : 'off'}
        </button>
        <button
          type="button"
          onClick={onToggleRecord}
          style={{ ...hudBtn, color: recording ? '#ff4d5e' : undefined }}
        >
          {recording ? '● rec' : 'record'}
        </button>
      </div>
    </div>
  )
}

const hudBtn: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  color: 'inherit',
  font: 'inherit',
  padding: '3px 4px',
}
