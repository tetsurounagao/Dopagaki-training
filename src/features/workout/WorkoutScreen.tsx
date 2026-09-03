import { Link } from 'react-router-dom'
import { Screen } from '../../ui/Screen'

// Phase 1 でステートマシン（セットアップ → キャリブレーション → セット中 → 完了 →
// インターバル → 分岐）と game/ 連携を実装する。ここは遷移確認用の骨組み。
export function WorkoutScreen() {
  return (
    <Screen
      title="トレーニング"
      footer={
        <>
          <Link className="btn" to="/result">
            リザルトへ（ダミー）
          </Link>
          <Link className="btn btn--ghost" to="/">
            中断してホームへ
          </Link>
        </>
      }
    >
      <p style={{ color: 'var(--text-dim)' }}>
        Phase 1: タップカウンタ + 演出 + フィーバー + 分岐。
        <br />
        Phase 2: カメラ + 姿勢推定。
      </p>
    </Screen>
  )
}
