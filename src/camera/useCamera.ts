import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus =
  'idle' | 'prompting' | 'granted' | 'denied' | 'unsupported' | 'error'

export interface UseCamera {
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: CameraStatus
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
  },
}

/** 前面カメラを取得して <video> に流す。権限拒否時は手動モードにフォールバック。 */
export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus((s) => (s === 'granted' ? 'idle' : s))
  }, [])

  const start = useCallback(async () => {
    if (streamRef.current) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('prompting')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      if (track) {
        track.addEventListener('ended', () => {
          setStatus('idle')
          streamRef.current = null
        })
      }
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        await video.play().catch(() => undefined)
      }
      setStatus('granted')
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied')
      } else {
        setStatus('error')
        setError(e instanceof Error ? e.message : String(e))
      }
    }
  }, [])

  useEffect(() => stop, [stop])

  return { videoRef, status, error, start, stop }
}
