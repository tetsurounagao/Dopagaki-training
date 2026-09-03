/// <reference lib="webworker" />
// MediaPipe Tasks Vision PoseLandmarker を回す Web Worker。
// TODO(Phase 2): 調査結果を反映して @mediapipe/tasks-vision で実装する。
//   - FilesetResolver.forVisionTasks(wasmDir)
//   - PoseLandmarker.createFromOptions({ baseOptions:{ modelAssetPath, delegate }, runningMode:'VIDEO', numPoses })
//   - onmessage 'frame': detectForVideo(bitmap, tMs) → { landmarks, worldLandmarks }
// 現状はスタブ: init で error を返し、PoseClient を status='error'（＝推論なし）に落とす。

import type { PoseWorkerInMessage, PoseWorkerOutMessage } from './types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

function post(msg: PoseWorkerOutMessage, transfer?: Transferable[]) {
  ctx.postMessage(msg, transfer ?? [])
}

ctx.onmessage = (ev: MessageEvent<PoseWorkerInMessage>) => {
  const msg = ev.data
  switch (msg.type) {
    case 'init':
      post({
        type: 'error',
        message: 'poseWorker is a stub — MediaPipe not wired yet (Phase 2)',
      })
      break
    case 'frame':
      // スタブ: フレームは捨てる
      msg.bitmap.close()
      post({ type: 'dropped' })
      break
    case 'close':
      ctx.close()
      break
  }
}
