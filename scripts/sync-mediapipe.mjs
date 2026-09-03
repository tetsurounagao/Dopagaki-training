// MediaPipe Tasks Vision の wasm と PoseLandmarker(lite) モデルを public/models/ に用意する。
// - wasm: node_modules からコピー（毎回）
// - .task: 無ければ storage.googleapis.com からダウンロード（一度きり、~5.5MB）
// どちらも失敗しても警告のみ（ビルドは通す。実行時はカメラ無し=手動モードに劣化）。
// postinstall / predev / prebuild で走る。public/models/ は gitignore 済み。
import { cp, mkdir, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = process.cwd()
const modelsDir = join(root, 'public/models')
const wasmDir = join(modelsDir, 'wasm')

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
const modelPath = join(modelsDir, 'pose_landmarker_lite.task')

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function copyWasm() {
  try {
    // package.json は exports に無いが個々の wasm ファイルは exports されている。
    const oneWasm =
      require.resolve('@mediapipe/tasks-vision/vision_wasm_internal.js')
    const srcWasmDir = dirname(oneWasm) // .../@mediapipe/tasks-vision/wasm
    await mkdir(wasmDir, { recursive: true })
    await cp(srcWasmDir, wasmDir, { recursive: true })
    console.log('[sync-mediapipe] wasm -> public/models/wasm')
  } catch (e) {
    console.warn('[sync-mediapipe] wasm copy skipped:', e.message)
  }
}

async function fetchModel() {
  if (await exists(modelPath)) return
  try {
    await mkdir(modelsDir, { recursive: true })
    const res = await fetch(MODEL_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(modelPath, buf)
    console.log(
      `[sync-mediapipe] model -> public/models/pose_landmarker_lite.task (${(buf.length / 1e6).toFixed(1)} MB)`,
    )
  } catch (e) {
    console.warn(
      '[sync-mediapipe] model download skipped:',
      e.message,
      '\n  → 実機で使うには手動で配置:',
      MODEL_URL,
    )
  }
}

await copyWasm()
await fetchModel()
