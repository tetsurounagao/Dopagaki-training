// トレーニング実行のステートマシン（実装計画 §5）。
// この I/F は Phase 1 の並列作業の前提。reducer 実装は担当 B が下に書く。

import type { CalibrationProfile, WorkoutSession } from '../domain/types'
import type { GameSnapshot } from '../game/types'

export type WorkoutStateName =
  | 'home' // ルーティン一覧 / 続きから
  | 'exerciseSetup' // カメラ位置ガイド（Phase 1 は説明のみ）
  | 'calibration' // 3秒静止 + ゆっくり1rep（Phase 1 は空実装・スキップ可）
  | 'countdown' // 3..2..1
  | 'setActive' // rep カウント中
  | 'setComplete' // 賞賛 + 必要なら補正 UI
  | 'rest' // インターバル（restSec）+ 分岐ボタン
  | 'setIntro' // 「もう1セット突入」トランジション
  | 'result' // 総重量 + ポイント

export type WorkoutEvent =
  | { type: 'START_ROUTINE'; routineId: string }
  | { type: 'RESUME_SESSION' }
  | { type: 'DISCARD_SESSION' }
  | { type: 'SETUP_READY' } // → calibration（未キャリブレーション）or countdown
  | { type: 'CALIBRATION_DONE'; profile: CalibrationProfile }
  | { type: 'CALIBRATION_SKIP' }
  | { type: 'COUNTDOWN_DONE' }
  | { type: 'REP' } // タップ or 自動（Phase 2）。setActive で消費
  | { type: 'CORRECT_REPS'; delta: number } // setComplete での +/- 補正
  | { type: 'SET_DONE' } // 無操作タイムアウト or 手動確定
  | { type: 'REST_TICK' } // 1秒
  | { type: 'SKIP_REST' }
  | { type: 'ADD_REST'; sec: number }
  | { type: 'AGAIN' } // もう1セット → setIntro
  | { type: 'NEXT' } // 次メニュー（exerciseSetup）or リザルト
  | { type: 'INTRO_DONE' } // setIntro → countdown
  | { type: 'GO_HOME' }

export interface WorkoutContext {
  session: WorkoutSession
  menuIndex: number
  setIndex: number
  /** 現在セットの確定 rep 数 */
  reps: number
  /** 目標 rep を超えた分（BONUS 表示用） */
  bonusReps: number
  restRemainingSec: number
  countedBy: 'auto' | 'manual'
  /** このセット中に検出ロストがあったか（setComplete で補正 UI を出す） */
  hadDetectionLoss: boolean
  game: GameSnapshot
}

export interface WorkoutState {
  name: WorkoutStateName
  context: WorkoutContext
}

/**
 * 遷移表（担当 B が実装）:
 *
 *  home        --START_ROUTINE-->   exerciseSetup   (新規セッション作成)
 *  home        --RESUME_SESSION-->  <保存された progress.phase>
 *  exerciseSetup --SETUP_READY-->   calibration | countdown  (未/済 で分岐)
 *  calibration --CALIBRATION_DONE/SKIP--> countdown
 *  countdown   --COUNTDOWN_DONE-->  setActive
 *  setActive   --REP-->             setActive  (reps++, game=reduceRep, 目標超過で bonusReps++)
 *  setActive   --SET_DONE-->        setComplete
 *  setComplete --CORRECT_REPS-->    setComplete (reps += delta, 下限0)
 *  setComplete --(自動遷移)-->       rest
 *  rest        --REST_TICK-->       rest (restRemainingSec--)
 *  rest        --SKIP_REST/ADD_REST--> rest
 *  rest        --AGAIN-->           setIntro
 *  rest        --NEXT-->            exerciseSetup (次 menu) | result (最終)
 *  setIntro    --INTRO_DONE-->      countdown
 *  任意        --GO_HOME-->          home (session は finishedAt=null のまま = 続きから対象)
 *  result      --(保存)-->           home (session.finishedAt をセット)
 *
 * 副作用（B が結線）:
 *  - 各 REP と各状態遷移で persistSession() を呼ぶ
 *  - REP で effects.popRep / effects.voiceCount / effects.setGauge、
 *    最終セットなら effects.finalSetTail、フィーバー境界で startFever/endFever
 *  - setComplete で effects.setCompleteCelebration、setIntro で await effects.playSetIntro()
 */
