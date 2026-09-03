import { FEVER_MULTIPLIER, type GameConfig } from './types'

// 仮値。Phase 1 デモでプレイしながら調整する（実装計画 §12-1）。
// 目安: 通常テンポの 3〜5 セットで 1〜2 回フィーバーが出るくらい。
export const DEFAULT_GAME_CONFIG: GameConfig = {
  fever: {
    gaugePerRep: 0.06, // ~17 rep でゲージ満タン
    gaugeMax: 1,
    instantChancePerRep: 0.015, // ~1/67 rep で即発動
    durationReps: 10,
    multiplier: FEVER_MULTIPLIER,
  },
}
