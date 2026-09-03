/// <reference lib="webworker" />
// MediaPipe Tasks Vision PoseLandmarker を回す Web Worker。
// メインは PoseClient.ts。メッセージ型は ./types.ts。

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type {
  Landmark,
  PoseDelegate,
  PoseWorkerInit,
  PoseWorkerInMessage,
  PoseWorkerOutMessage,
} from './types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

let landmarker: PoseLandmarker | null = null
let lastTs = 0

function post(msg: PoseWorkerOutMessage) {
  ctx.postMessage(msg)
}

async function build(
  cfg: PoseWorkerInit,
  delegate: PoseDelegate,
): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(cfg.wasmDir)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: cfg.modelUrl, delegate },
    runningMode: 'VIDEO',
    numPoses: cfg.numPoses,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  })
}

async function init(cfg: PoseWorkerInit) {
  try {
    landmarker = await build(cfg, cfg.delegate)
  } catch {
    // GPU delegate 失敗時は CPU にフォールバック
    try {
      landmarker = await build(cfg, 'CPU')
    } catch (err) {
      post({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
      return
    }
  }
  post({ type: 'ready' })
}

function toLandmarks(res: PoseLandmarkerResult): Landmark[] {
  const first = res.landmarks[0]
  if (!first) return []
  return first.map((l) => ({
    x: l.x,
    y: l.y,
    z: l.z,
    visibility: l.visibility ?? 0,
  }))
}

ctx.onmessage = (ev: MessageEvent<PoseWorkerInMessage>) => {
  const msg = ev.data
  switch (msg.type) {
    case 'init':
      void init(msg)
      break

    case 'frame': {
      if (!landmarker) {
        msg.bitmap.close()
        post({ type: 'dropped' })
        return
      }
      // detectForVideo は厳密に単調増加のタイムスタンプを要求する
      const ts = Math.max(msg.tMs, lastTs + 1)
      lastTs = ts
      const t0 = performance.now()
      try {
        const res = landmarker.detectForVideo(msg.bitmap, ts)
        post({
          type: 'result',
          frame: { landmarks: toLandmarks(res), tMs: msg.tMs },
          inferMs: performance.now() - t0,
        })
      } catch (err) {
        post({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      } finally {
        msg.bitmap.close()
      }
      break
    }

    case 'close':
      landmarker?.close()
      landmarker = null
      ctx.close()
      break
  }
}
