import type { ReactNode } from 'react'

interface ScreenProps {
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Screen({ title, children, footer }: ScreenProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        padding: '2rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom))',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem' }}>{title}</h1>
      <div style={{ flex: 1 }}>{children}</div>
      {footer && (
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem' }}>
          {footer}
        </div>
      )}
    </div>
  )
}
