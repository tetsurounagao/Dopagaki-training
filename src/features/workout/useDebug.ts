import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PoseFrame } from '../../pose/types'
import type { Vision } from './useVision'

// ---- 有効化（?debug=1 or 画面隅トリプルタップ）----

export function useDebug() {
  const [params] = useSearchParams()
  const [tapToggled, setTapToggled] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const taps = useRef<number[]>([])

  const enabled = params.get('debug') === '1' || tapToggled

  const cornerTap = useCallback(() => {
    const now = Date.now()
    taps.current = [...taps.current, now].filter((t) => now - t < 600)
    if (taps.current.length >= 3) {
      taps.current = []
      setTapToggled((v) => !v)
    }
  }, [])

  return {
    enabled,
    showSkeleton,
    toggleSkeleton: () => setShowSkeleton((v) => !v),
    cornerTap,
  }
}

// ---- セッション記録（ランドマーク列 + イベントを JSON でダウンロード）----

interface RecordEntry {
  tMs: number
  landmarks?: PoseFrame['landmarks']
  event?: string
}

export function useSessionRecorder(onFrame: Vision['onFrame']) {
  const [recording, setRecording] = useState(false)
  const buf = useRef<RecordEntry[]>([])
  const recRef = useRef(false)

  useEffect(() => {
    return onFrame((frame) => {
      if (!recRef.current) return
      buf.current.push({ tMs: frame.tMs, landmarks: frame.landmarks })
    })
  }, [onFrame])

  const logEvent = useCallback((event: string) => {
    if (!recRef.current) return
    buf.current.push({ tMs: performance.now(), event })
  }, [])

  const toggle = useCallback(() => {
    if (recRef.current) {
      recRef.current = false
      setRecording(false)
      const blob = new Blob([JSON.stringify(buf.current)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pose-session-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      buf.current = []
    } else {
      buf.current = []
      recRef.current = true
      setRecording(true)
    }
  }, [])

  return { recording, toggle, logEvent }
}
