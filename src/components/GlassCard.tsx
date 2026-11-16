import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

type Props = PropsWithChildren<{
  level?: 1 | 2 | 3
  className?: string
}>

const levelStyles = {
  1: 'glass-subtle shadow-glass1',
  2: 'glass-panel shadow-glass2',
  3: 'glass-elevated shadow-glass3',
}

export const GlassCard = ({ level = 2, className, children }: Props) => (
  <section className={clsx('glass p-5 text-text-primary', levelStyles[level], className)}>{children}</section>
)
