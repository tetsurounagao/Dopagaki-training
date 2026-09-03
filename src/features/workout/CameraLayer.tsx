import { useEffect, useRef } from 'react'
import { drawSkeleton } from '../../pose/drawSkeleton'
import type { PoseFrame } from '../../pose/types'
import type { Vision } from './useVision'

interface Props {
  vision: Vision
  showSkeleton: boolean
  minVisibility: number
}

// 実行画面の最背面レイヤー: 前面カメラ映像（CSS でミラー）+ スケルトン重畳。
// ランドマークは PoseClient 側で x を反転済みなので、非変換の canvas に描けばミラー映像と一致する。
// objectFit: cover のクロップぶんの誤差は Phase 2 デバッグでは許容。
export function CameraLayer({ vision, showSkeleton, minVisibility }: Props) {
  const { videoRef, onFrame, cameraStatus } = vision
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latest = useRef<PoseFrame | null>(null)
  const hidden = cameraStatus !== 'granted'

  useEffect(() => onFrame((f) => (latest.current = f)), [onFrame])

  useEffect(() => {
    if (!showSkeleton) return
    let raf = 0
    const tick = () => {
      const c = canvasRef.current
      if (c) {
        const w = c.clientWidth
        const h = c.clientHeight
        if (w && h) {
          if (c.width !== w) c.width = w
          if (c.height !== h) c.height = h
          drawSkeleton(c, latest.current?.landmarks ?? null, { minVisibility })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [showSkeleton, minVisibility])

  return (
    <>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          background: '#000',
          zIndex: 0,
          opacity: hidden ? 0 : 1,
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
          display: showSkeleton && !hidden ? 'block' : 'none',
        }}
      />
    </>
  )
}
