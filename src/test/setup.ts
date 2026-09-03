import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

// jsdom は canvas 未実装。effects 層（PixiJS）がテスト中に描画コンテキストを
// 取りに来ても no-op で落ちるよう、getContext を null 返しにしておく。
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as HTMLCanvasElement['getContext']
}
