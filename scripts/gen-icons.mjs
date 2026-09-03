// PWA 用の仮アイコンを生成する。
// 稲妻マークのプレースホルダ。Phase 5 で商用フリー素材に差し替える。
// 使い方: npm run gen:icons
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [11, 11, 18] // #0b0b12
const FG = [255, 210, 30] // #ffd21e

// 32x32 の稲妻マスク（1 = 前景）。上下左右に余白。
const MASK = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '..................xxx...........',
  '.................xxxx...........',
  '................xxxx............',
  '...............xxxx.............',
  '..............xxxx..............',
  '.............xxxx...............',
  '............xxxxxxxxx...........',
  '...........xxxxxxxxxx...........',
  '..........xxxxxxxxxx............',
  '.................xxx............',
  '................xxxx............',
  '...............xxxx.............',
  '..............xxxx..............',
  '.............xxxx...............',
  '............xxxx................',
  '...........xxxx.................',
  '..........xxxx..................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePng(size) {
  const scale = size / 32
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const my = Math.min(31, Math.floor(y / scale))
      const mx = Math.min(31, Math.floor(x / scale))
      const on = MASK[my][mx] === 'x'
      const [r, g, b] = on ? FG : BG
      const p = rowStart + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const file = join(OUT_DIR, `pwa-${size}.png`)
  writeFileSync(file, makePng(size))
  console.log('wrote', file)
}
