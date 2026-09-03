import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../store/db'
import { saveRoutine } from '../../store/routines'
import { saveSettings } from '../../store/settings'
import { WorkoutScreen } from './WorkoutScreen'
import { ResultScreen } from '../result/ResultScreen'

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
})

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

function renderWorkout() {
  return render(
    <MemoryRouter initialEntries={['/workout?routine=r1']}>
      <Routes>
        <Route path="/workout" element={<WorkoutScreen />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WorkoutScreen 統合', () => {
  it('タップで1ルーティンを完走し、リザルトに総重量が出る', async () => {
    await saveSettings({ bodyWeightKg: 60 })
    await saveRoutine({
      id: 'r1',
      name: 't',
      createdAt: 1,
      menus: [
        {
          id: 'm1',
          exerciseId: 'armCurl',
          weightKg: 10,
          repsPerSet: 3,
          sets: 1,
          restSec: 5,
        },
      ],
    })

    renderWorkout()

    // exerciseSetup
    await tick(50)
    fireEvent.click(await screen.findByText('準備OK'))

    // calibration は 1200ms で自動スキップ → countdown 3×800ms
    await tick(1300)
    await tick(2600)

    // setActive: タップ領域を 3 回
    const tapText = await screen.findByText('画面をタップしてカウント')
    const tapButton = tapText.closest('button') as HTMLButtonElement
    fireEvent.click(tapButton)
    fireEvent.click(tapButton)
    fireEvent.click(tapButton)

    expect(
      screen.getByText((_, el) => el?.textContent === '3 / 3'),
    ).toBeInTheDocument()

    // セット完了 → setComplete（2600ms 自動）→ rest
    fireEvent.click(screen.getByText('セット完了'))
    await tick(2700)

    // 単一メニューなので「次のメニューへ」で result
    fireEvent.click(
      await screen.findByText(/次のメニューへ/, {}, { timeout: 3000 }),
    )
    await tick(200)

    // ResultScreen
    expect(await screen.findByText('総重量')).toBeInTheDocument()
    // フィーバー無し → 総重量 = ポイント = 10kg × 実タップ3回 = 30（両方に表示）
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/10kg × 3回 \/ 1セット/)).toBeInTheDocument()

    const finished = await db.sessions
      .filter((s) => s.finishedAt !== null)
      .toArray()
    expect(finished).toHaveLength(1)
    expect(finished[0]!.totalVolumeKg).toBe(30)
    expect(finished[0]!.totalPoints).toBe(30)
  })
})
