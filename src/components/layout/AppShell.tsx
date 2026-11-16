import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { ThemeToggle } from '../ThemeToggle'

const links = [
  ['/', 'Dashboard'],
  ['/jobs', 'Jobs'],
  ['/jobs/new', 'Add Job'],
  ['/contacts', 'Contacts'],
  ['/documents', 'Documents'],
  ['/profile', 'Profile'],
]

export const AppShell = () => (
  <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[240px_1fr]">
    <aside className="glass glass-panel rounded-3xl p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid size-10 place-items-center rounded-2xl bg-accent text-lg font-bold text-on-accent shadow-glass1">J</div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">JobTrail</h1>
          <p className="text-xs text-text-muted">Application cockpit</p>
        </div>
      </div>
      <nav aria-label="Primary navigation" className="space-y-1.5">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'block rounded-xl px-3 py-2.5 text-sm font-medium',
              isActive ? 'bg-accent/15 text-accent-strong shadow-glass1' : 'text-text-secondary hover:bg-surface-elevated/70 hover:text-text-primary',
            )}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
    <main className="min-w-0 space-y-5">
      <header className="glass glass-panel rounded-3xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Workspace</p>
            <p className="mt-1 text-sm text-text-secondary">Track every opportunity with less admin.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" onClick={() => void supabase.auth.signOut()} className="rounded-xl border border-border/40 bg-surface-panel/70 px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary">Sign out</button>
          </div>
        </div>
      </header>
      <Outlet />
    </main>
  </div>
)
