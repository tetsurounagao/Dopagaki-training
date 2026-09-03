import { useEffect, useRef, useState } from 'react'
import { useCamera, type CameraStatus } from '../../camera/useCamera'
import { createPoseClient } from '../../pose/PoseClient'
import type { PoseFrame, PoseMeta, PoseStatus } from '../../pose/types'

const FPS_ACTIVE = 24
const FPS_LOW = 10

export interface Vision {
  videoRef: React.RefObject<HTMLVideoElement | null>
  cameraStatus: CameraStatus
  cameraError: string | null
  poseStatus: PoseStatus
  meta: PoseMeta
  /** 最新フレームを購読（Phase 3 で RepDetector がここに繋がる） */
  onFrame: (cb: (frame: PoseFrame) => void) => () => void
}

/**
 * カメラ + PoseClient のライフサイクルをまとめる。
 * active=false の間は両方停止。lowPower 中は推論 fps を落とす。
 */
export function useVision({
  active,
  lowPower,
}: {
  active: boolean
  lowPower: boolean
}): Vision {
  const camera = useCamera()
  const [client] = useState(() => createPoseClient())
  const [poseStatus, setPoseStatus] = useState<PoseStatus>('idle')
  const [meta, setMeta] = useState<PoseMeta>(client.meta)
  const metaThrottle = useRef(0)

  // status / meta 購読
  useEffect(() => {
    const offS = client.onStatus(setPoseStatus)
    const offM = client.onMeta((m) => {
      const now = performance.now()
      if (now - metaThrottle.current < 250) return
      metaThrottle.current = now
      setMeta(m)
    })
    return () => {
      offS()
      offM()
    }
  }, [client])

  // 起動・停止
  useEffect(() => {
    if (active) {
      void camera.start()
    } else {
      client.stop()
      camera.stop()
    }
  }, [active, camera, client])

  // カメラ許可が下りたら推論開始
  useEffect(() => {
    if (active && camera.status === 'granted' && camera.videoRef.current) {
      client.start(camera.videoRef.current)
    }
  }, [active, camera.status, camera.videoRef, client])

  // 省電力モード
  useEffect(() => {
    client.setTargetFps(lowPower ? FPS_LOW : FPS_ACTIVE)
  }, [client, lowPower])

  // バックグラウンドで推論停止
  useEffect(() => {
    const onVis = () => client.setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [client])

  useEffect(() => () => client.dispose(), [client])

  return {
    videoRef: camera.videoRef,
    cameraStatus: camera.status,
    cameraError: camera.error,
    poseStatus,
    meta,
    onFrame: client.onResult,
  }
}
