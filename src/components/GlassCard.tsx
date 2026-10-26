import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

type Props = PropsWithChildren<{
  level?: 1 | 2 | 3
  className?: string
}>

const levelStyles = {
  1: 'bg-[var(--glass-bg-1)] shadow-glass1',
  2: 'bg-[var(--glass-bg-2)] shadow-glass2',
  3: 'bg-[var(--glass-bg-3)] shadow-glass3',
}

export const GlassCard = ({ level = 2, className, children }: Props) => (
  <section className={clsx('glass relative rounded-2xl border border-white/20 p-4 text-slate-100', levelStyles[level], className)}>{children}</section>
)
