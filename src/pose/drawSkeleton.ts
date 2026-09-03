import { POSE_CONNECTIONS, type Landmark } from './types'

interface DrawOpts {
  minVisibility?: number
  color?: string
  jointColor?: string
  lineWidth?: number
}

/** landmarks（0..1 正規化、mirror 適用済み）を canvas 全面にスケルトン描画する。 */
export function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[] | null,
  opts: DrawOpts = {},
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  if (!landmarks || landmarks.length === 0) return

  const minVis = opts.minVisibility ?? 0.5
  const color = opts.color ?? '#ffd21e'
  const jointColor = opts.jointColor ?? '#ffffff'
  const lineWidth = opts.lineWidth ?? Math.max(2, w * 0.006)

  ctx.lineWidth = lineWidth
  ctx.strokeStyle = color
  for (const [a, b] of POSE_CONNECTIONS) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (!la || !lb) continue
    if (la.visibility < minVis || lb.visibility < minVis) continue
    ctx.beginPath()
    ctx.moveTo(la.x * w, la.y * h)
    ctx.lineTo(lb.x * w, lb.y * h)
    ctx.stroke()
  }

  ctx.fillStyle = jointColor
  const r = Math.max(2, w * 0.008)
  for (const l of landmarks) {
    if (l.visibility < minVis) continue
    ctx.beginPath()
    ctx.arc(l.x * w, l.y * h, r, 0, Math.PI * 2)
    ctx.fill()
  }
}
