import { describe, expect, it } from 'vitest'
import { DEFAULT_GAME_CONFIG } from './config'
import { initGameSnapshot, reduceRep, type GameConfig } from './types'

const noFever: GameConfig = {
  fever: {
    ...DEFAULT_GAME_CONFIG.fever,
    gaugePerRep: 0,
    instantChancePerRep: 0,
  },
}

describe('reduceRep', () => {
  it('フィーバーなしなら totalPoints === totalVolumeKg', () => {
    let s = initGameSnapshot()
    for (let i = 0; i < 30; i++) {
      s = reduceRep(s, { effectiveWeightKg: 10, rng: () => 1 }, noFever)
    }
    expect(s.totalVolumeKg).toBe(300)
    expect(s.totalPoints).toBe(300)
    expect(s.fever.active).toBe(false)
  })

  it('ゲージ満タンでフィーバー発動し、以降の rep が ×2', () => {
    const cfg: GameConfig = {
      fever: {
        gaugePerRep: 0.5,
        gaugeMax: 1,
        instantChancePerRep: 0,
        durationReps: 3,
        multiplier: 2,
      },
    }
    let s = initGameSnapshot()
    s = reduceRep(s, { effectiveWeightKg: 10, rng: () => 1 }, cfg) // gauge 0.5
    expect(s.fever.active).toBe(false)
    s = reduceRep(s, { effectiveWeightKg: 10, rng: () => 1 }, cfg) // gauge 1.0 → 発動
    expect(s.fever.active).toBe(true)
    expect(s.fever.triggeredCount).toBe(1)
    // 発動した rep 自体は通常倍率（発動は rep 後）
    expect(s.totalPoints).toBe(20)

    s = reduceRep(s, { effectiveWeightKg: 10, rng: () => 1 }, cfg) // fever: +20
    expect(s.lastRepWasFever).toBe(true)
    expect(s.totalPoints).toBe(40)
    expect(s.totalVolumeKg).toBe(30) // volume は倍率非依存
  })

  it('即発動抽選（rng < 閾値）でゲージ未満でも発動', () => {
    const cfg: GameConfig = {
      fever: {
        gaugePerRep: 0.01,
        gaugeMax: 1,
        instantChancePerRep: 0.02,
        durationReps: 5,
        multiplier: 2,
      },
    }
    let s = initGameSnapshot()
    s = reduceRep(s, { effectiveWeightKg: 5, rng: () => 0.01 }, cfg)
    expect(s.fever.active).toBe(true)
  })

  it('フィーバーは durationReps 消化で終了しゲージが 0 に戻る', () => {
    const cfg: GameConfig = {
      fever: {
        gaugePerRep: 0,
        gaugeMax: 1,
        instantChancePerRep: 1,
        durationReps: 2,
        multiplier: 2,
      },
    }
    let s = initGameSnapshot()
    s = reduceRep(s, { effectiveWeightKg: 1, rng: () => 0 }, cfg) // 発動, remaining 2
    s = reduceRep(s, { effectiveWeightKg: 1, rng: () => 0 }, cfg) // fever rep, remaining 1
    expect(s.fever.active).toBe(true)
    s = reduceRep(s, { effectiveWeightKg: 1, rng: () => 0 }, cfg) // fever rep, remaining 0 → 終了
    expect(s.fever.active).toBe(false)
    expect(s.fever.gauge).toBe(0)
  })
})
