import { NavLink, Outlet } from 'react-router-dom'

const links = [
  ['/', 'Dashboard'],
  ['/jobs', 'Jobs'],
  ['/jobs/new', 'Add Job'],
  ['/contacts', 'Contacts'],
  ['/documents', 'Documents'],
  ['/profile', 'Profile'],
]

export const AppShell = () => {
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[220px_1fr]">
      <aside className="glass rounded-2xl border border-white/20 p-3 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
        <h1 className="mb-4 text-lg font-semibold">JobTrail</h1>
        <nav className="space-y-1">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="space-y-4">
        <header className="glass rounded-2xl border border-white/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-200">Frosted glass over a soft aurora</p>
            <button type="button" className="rounded-lg border border-white/20 px-3 py-1 text-xs">⌘K Search</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
