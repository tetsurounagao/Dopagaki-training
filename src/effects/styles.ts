import type { TextStyleOptions } from 'pixi.js'
import { GOLD, WHITE } from './colors'

// 仮の「重厚フォント」指定。Phase 1 はアセット未確定なのでシステムの明朝/セリフを積む。
// Phase 5 で商用フリーの GOD 系ディスプレイフォントに差し替える。
export function godText(
  fontSize: number,
  opts: { gold?: boolean; glow?: number } = {},
): TextStyleOptions {
  const gold = opts.gold ?? true
  return {
    fontFamily:
      '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", Georgia, "Times New Roman", serif',
    fontSize,
    fontWeight: '900',
    fill: gold ? GOLD : WHITE,
    stroke: { color: 0x000000, width: Math.max(4, fontSize * 0.06) },
    dropShadow: {
      color: GOLD,
      blur: opts.glow ?? 12,
      distance: 0,
      angle: 0,
      alpha: 0.7,
    },
    letterSpacing: 3,
    align: 'center',
  }
}
