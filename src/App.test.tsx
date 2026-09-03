import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('ホーム画面が描画される', async () => {
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Dopagaki' }),
    ).toBeInTheDocument()
  })
})
