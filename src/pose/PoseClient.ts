import {
  DEFAULT_POSE_OPTIONS,
  type Landmark,
  type PoseClient,
  type PoseClientOptions,
  type PoseFrame,
  type PoseMeta,
  type PoseStatus,
  type PoseWorkerOutMessage,
} from './types'

type ResultCb = (frame: PoseFrame) => void
type MetaCb = (meta: PoseMeta) => void
type StatusCb = (status: PoseStatus) => void

class RollingRate {
  private ts: number[] = []
  private windowMs: number
  constructor(windowMs = 2000) {
    this.windowMs = windowMs
  }
  mark(now = performance.now()) {
    this.ts.push(now)
    const cut = now - this.windowMs
    while (this.ts.length && this.ts[0]! < cut) this.ts.shift()
  }
  fps(now = performance.now()): number {
    const cut = now - this.windowMs
    const recent = this.ts.filter((t) => t >= cut)
    if (recent.length < 2) return 0
    const span = (recent[recent.length - 1]! - recent[0]!) / 1000
    return span > 0 ? (recent.length - 1) / span : 0
  }
}

function mirrorLandmarks(lms: Landmark[]): Landmark[] {
  return lms.map((l) => ({ ...l, x: 1 - l.x }))
}

/**
 * メインスレッド側の PoseLandmarker クライアント。
 * <video> フレームを Worker に渡し、33点ランドマークを購読する。
 * モデル未配置・WebGL 不可などで Worker が error を返した場合は status='error' になり、
 * onResult は発火しない（カメラプレビューや手動モードには影響しない）。
 */
export function createPoseClient(options: PoseClientOptions = {}): PoseClient {
  const opts = { ...DEFAULT_POSE_OPTIONS, ...options }

  let worker: Worker | null = null
  let video: HTMLVideoElement | null = null
  let running = false
  let paused = false
  let busy = false
  let targetFps = opts.targetFps
  let lastSentAt = 0
  let rvfcHandle = 0
  let rafHandle = 0

  let status: PoseStatus = 'idle'
  const meta: PoseMeta = { inferMs: 0, inferFps: 0, displayFps: 0, dropped: 0 }
  const inferRate = new RollingRate()
  const frameRate = new RollingRate()

  const resultCbs = new Set<ResultCb>()
  const metaCbs = new Set<MetaCb>()
  const statusCbs = new Set<StatusCb>()

  const setStatus = (s: PoseStatus) => {
    if (s === status) return
    status = s
    statusCbs.forEach((cb) => cb(s))
  }
  const emitMeta = () => metaCbs.forEach((cb) => cb({ ...meta }))

  function ensureWorker() {
    if (worker) return
    setStatus('loading')
    worker = new Worker(new URL('./poseWorker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (ev: MessageEvent<PoseWorkerOutMessage>) => {
      const msg = ev.data
      switch (msg.type) {
        case 'ready':
          setStatus('running')
          break
        case 'error':
          setStatus('error')
          break
        case 'dropped':
          meta.dropped += 1
          busy = false
          emitMeta()
          break
        case 'result': {
          busy = false
          const now = performance.now()
          inferRate.mark(now)
          meta.inferMs = msg.inferMs
          meta.inferFps = inferRate.fps(now)
          meta.displayFps = frameRate.fps(now)
          emitMeta()
          const frame: PoseFrame = opts.mirror
            ? { ...msg.frame, landmarks: mirrorLandmarks(msg.frame.landmarks) }
            : msg.frame
          resultCbs.forEach((cb) => cb(frame))
          break
        }
      }
    }
    worker.onerror = () => setStatus('error')
    worker.postMessage({
      type: 'init',
      wasmDir: opts.wasmDir,
      modelUrl: opts.modelUrl,
      delegate: opts.delegate,
      numPoses: opts.numPoses,
    })
  }

  function pump() {
    if (!running || paused || !video || !worker) return
    const now = performance.now()
    const minInterval = 1000 / Math.max(1, targetFps)
    const ready = video.readyState >= 2 && video.videoWidth > 0
    if (ready && !busy && now - lastSentAt >= minInterval) {
      lastSentAt = now
      busy = true
      frameRate.mark(now)
      createImageBitmap(video)
        .then((bitmap) => {
          if (!worker || !running) {
            bitmap.close()
            busy = false
            return
          }
          worker.postMessage({ type: 'frame', bitmap, tMs: now }, [bitmap])
        })
        .catch(() => {
          busy = false
        })
    }
    scheduleNext()
  }

  function scheduleNext() {
    if (!video) return
    const vrfc = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number
    }
    if (typeof vrfc.requestVideoFrameCallback === 'function') {
      rvfcHandle = vrfc.requestVideoFrameCallback(() => pump())
    } else {
      rafHandle = requestAnimationFrame(() => pump())
    }
  }

  function cancelPump() {
    const vrfc = video as
      | (HTMLVideoElement & {
          cancelVideoFrameCallback?: (h: number) => void
        })
      | null
    if (rvfcHandle && vrfc?.cancelVideoFrameCallback) {
      vrfc.cancelVideoFrameCallback(rvfcHandle)
    }
    if (rafHandle) cancelAnimationFrame(rafHandle)
    rvfcHandle = 0
    rafHandle = 0
  }

  return {
    start(v) {
      video = v
      ensureWorker()
      running = true
      busy = false
      scheduleNext()
    },
    stop() {
      running = false
      cancelPump()
    },
    setTargetFps(fps) {
      targetFps = Math.max(1, fps)
    },
    setPaused(p) {
      paused = p
      if (!p && running) scheduleNext()
    },
    onResult(cb) {
      resultCbs.add(cb)
      return () => resultCbs.delete(cb)
    },
    onMeta(cb) {
      metaCbs.add(cb)
      return () => metaCbs.delete(cb)
    },
    onStatus(cb) {
      statusCbs.add(cb)
      return () => statusCbs.delete(cb)
    },
    get status() {
      return status
    },
    get meta() {
      return { ...meta }
    },
    dispose() {
      running = false
      cancelPump()
      worker?.postMessage({ type: 'close' })
      worker?.terminate()
      worker = null
      video = null
      resultCbs.clear()
      metaCbs.clear()
      statusCbs.clear()
      setStatus('idle')
    },
  }
}
