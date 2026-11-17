import { useState, type ButtonHTMLAttributes, type ComponentType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import type { JobStatus } from '../../types/job'

const controlClass = 'w-full rounded-xl border border-border/35 bg-surface-solid px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent/70 focus:ring-2 focus:ring-accent/20'

export const Button = ({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) => (
  <button
    {...props}
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'primary' && 'bg-accent text-on-accent shadow-glass1 hover:bg-accent-strong',
      variant === 'secondary' && 'border border-border/35 bg-surface-solid text-text-primary hover:bg-surface-elevated',
      variant === 'ghost' && 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
      variant === 'danger' && 'border border-rejected/30 bg-rejected/10 text-rejected hover:bg-rejected/15',
      className,
    )}
  />
)

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={clsx(controlClass, props.className)} />
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={clsx(controlClass, props.className)} />
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={clsx(controlClass, props.className)} />

export const Card = ({ children, className, level = 2 }: { children: ReactNode; className?: string; level?: 1 | 2 | 3 }) => (
  <section className={clsx('glass p-5 text-text-primary transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none', level === 1 && 'glass-subtle shadow-glass1', level === 2 && 'glass-panel shadow-glass2', level === 3 && 'glass-elevated shadow-glass3', className)}>
    {children}
  </section>
)

const statusClass: Record<JobStatus, string> = {
  saved: 'bg-ghosted/15 text-ghosted',
  applied: 'bg-applied/15 text-applied',
  interview: 'bg-interviewing/15 text-interviewing',
  offer: 'bg-offer/15 text-offer',
  rejected: 'bg-rejected/15 text-rejected',
  ghosted: 'bg-ghosted/15 text-ghosted',
}

export const Badge = ({ status, children }: { status?: JobStatus; children?: ReactNode }) => (
  <span className={clsx('inline-flex items-center rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium', status ? statusClass[status] : 'bg-surface-subtle text-text-secondary')}>{children ?? status}</span>
)

export const EmptyState = ({ title, description, icon: Icon, action }: { title: string; description: string; icon?: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>; action?: ReactNode }) => (
  <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/30 bg-surface-subtle/35 px-5 text-center">
    {Icon && <Icon size={22} className="text-text-muted" aria-hidden="true" />}
    <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    <p className="max-w-md text-sm text-text-secondary">{description}</p>
    {action}
  </div>
)

export const Skeleton = ({ className }: { className?: string }) => <div className={clsx('animate-pulse rounded-xl bg-surface-elevated/60 motion-reduce:animate-none', className)} />

export const Table = ({ children, className }: { children: ReactNode; className?: string }) => <div className={clsx('surface-solid overflow-auto rounded-2xl p-2', className)}><table className="min-w-full text-left text-sm">{children}</table></div>
export const Tabs = ({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) => <div role="tablist" className="flex gap-1 rounded-xl bg-surface-subtle/60 p-1">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={active === tab} onClick={() => onChange(tab)} className={clsx('rounded-lg px-3 py-2 text-sm text-text-secondary focus-visible:ring-2 focus-visible:ring-accent/60', active === tab ? 'bg-surface-solid text-text-primary shadow-glass1' : 'hover:text-text-primary')}>{tab}</button>)}</div>
export const Toast = ({ message, onClose }: { message: string; onClose?: () => void }) => <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-surface-elevated px-3 py-2 text-sm text-text-primary shadow-glass2"><span>{message}</span>{onClose && <button type="button" aria-label="Dismiss notification" onClick={onClose}><X size={16} aria-hidden="true" /></button>}</div>
export const Modal = ({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) => open ? <div role="presentation" className="fixed inset-0 z-50 grid place-items-center bg-canvas/70 p-4 backdrop-blur-sm" onMouseDown={onClose}><div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="glass glass-elevated w-full max-w-lg rounded-2xl p-5" onMouseDown={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 id="modal-title" className="font-semibold text-text-primary">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-lg p-2 text-text-secondary hover:bg-surface-elevated"><X size={17} aria-hidden="true" /></button></div>{children}</div></div> : null
export const Dropdown = ({ label, children }: { label: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false)
  return <div className="relative"><Button type="button" variant="secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{label}</Button>{open && <div className="glass glass-elevated absolute right-0 top-12 z-20 min-w-44 rounded-xl p-2">{children}</div>}</div>
}
