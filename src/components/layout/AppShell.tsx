import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Menu, Search, UserRound, X } from 'lucide-react'
import type { Animation } from 'react-useanimations'
import home from 'react-useanimations/lib/home'
import barChart from 'react-useanimations/lib/barChart'
import calendar from 'react-useanimations/lib/calendar'
import inbox from 'react-useanimations/lib/inbox'
import briefcase from 'react-useanimations/lib/briefcase'
import plusCircle from 'react-useanimations/lib/plusCircle'
import messageCircle from 'react-useanimations/lib/messageCircle'
import fileText from 'react-useanimations/lib/fileText'
import settings from 'react-useanimations/lib/settings'
import logOut from 'react-useanimations/lib/logOut'
import { AnimatedControl } from '../ui/AnimatedIcon'
import { supabase } from '../../lib/supabase'
import { ThemeToggle } from '../ThemeToggle'

type NavItem = {
  to: string
  label: string
  icon: Animation
  end?: boolean
}

const links: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: home, end: true },
  { to: '/statistics', label: 'Statistics', icon: barChart },
  { to: '/calendar', label: 'Calendar', icon: calendar },
  { to: '/needs-review', label: 'Needs review', icon: inbox },
  { to: '/jobs', label: 'Jobs', icon: briefcase, end: true },
  { to: '/jobs/new', label: 'Add Job', icon: plusCircle },
  { to: '/contacts', label: 'Contacts', icon: messageCircle },
  { to: '/documents', label: 'Documents', icon: fileText },
  { to: '/profile', label: 'Profile', icon: settings },
]

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export const AppShell = () => {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [userName, setUserName] = useState('there')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error(error)
        return
      }
      if (active && data.user) {
        const name = typeof data.user.user_metadata?.display_name === 'string'
          ? data.user.user_metadata.display_name
          : data.user.email?.split('@')[0]
        setUserName(name || 'there')
        setUserEmail(data.user.email || '')
      }
    })
    return () => {
      active = false
    }
  }, [])

  const initials = useMemo(() => userName.slice(0, 2).toUpperCase(), [userName])
  const closeMobileMenu = () => setMobileOpen(false)
  const signOut = () => {
    setProfileOpen(false)
    void supabase.auth.signOut()
  }

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(search.trim() ? `/jobs?search=${encodeURIComponent(search.trim())}` : '/jobs')
    setMobileSearchOpen(false)
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-[80px_1fr] lg:grid-cols-[240px_1fr]">
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={closeMobileMenu} className="fixed inset-0 z-30 bg-canvas/60 backdrop-blur-sm md:hidden" />}
      <aside className={clsx(
        'glass glass-panel fixed inset-y-4 left-4 z-40 flex w-60 flex-col rounded-3xl p-3 transition-transform duration-200 md:static md:inset-auto md:z-auto md:w-20 md:translate-x-0 lg:w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]',
      )}
      >
        <div className="mb-8 flex items-center justify-between gap-3 px-2 md:justify-center lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-lg font-bold text-on-accent shadow-glass1">J</div>
            <div className="md:hidden lg:block">
              <h1 className="text-lg font-semibold tracking-tight text-text-primary">JobTrail</h1>
              <p className="text-xs text-text-muted">Application cockpit</p>
            </div>
          </div>
          <button type="button" aria-label="Close navigation" onClick={closeMobileMenu} className="grid size-9 place-items-center rounded-xl text-text-secondary hover:bg-surface-elevated hover:text-text-primary md:hidden">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Primary navigation" className="space-y-1.5">
          {links.map(({ to, label, icon, end }) => (
            <AnimatedControl key={to} animation={icon} size={20}>
              {(eventProps, iconNode) => (
                <NavLink
                  {...eventProps}
                  to={to}
                  end={end}
                  onClick={(event) => {
                    eventProps.onClick(event)
                    closeMobileMenu()
                  }}
                  title={label}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 md:justify-center lg:justify-start',
                    isActive ? 'bg-accent/15 text-accent-strong shadow-glass1' : 'text-text-secondary hover:bg-surface-elevated/70 hover:text-text-primary',
                  )}
                >
                  {iconNode}
                  <span className="md:hidden lg:inline">{label}</span>
                </NavLink>
              )}
            </AnimatedControl>
          ))}
        </nav>
        <div className="mt-auto border-t border-border/25 pt-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2 md:justify-center lg:justify-start">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-semibold text-accent-strong">{initials}</div>
            <div className="min-w-0 md:hidden lg:block">
              <p className="truncate text-sm font-medium text-text-primary">{userName}</p>
              <p className="truncate text-xs text-text-muted">{userEmail}</p>
            </div>
          </div>
          <AnimatedControl animation={logOut} size={19}>
            {(eventProps, iconNode) => (
              <button type="button" {...eventProps} onClick={(event) => { eventProps.onClick(event); signOut() }} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary outline-none hover:bg-surface-elevated hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent/60 md:justify-center lg:justify-start">
                {iconNode}
                <span className="md:hidden lg:inline">Sign out</span>
              </button>
            )}
          </AnimatedControl>
        </div>
      </aside>
      <main className="min-w-0 space-y-5">
        <header className="glass glass-panel rounded-3xl px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-h-10 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border/35 bg-surface-panel/70 text-text-secondary hover:bg-surface-elevated hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent/60 md:hidden">
                <Menu size={19} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-text-primary sm:text-lg">{getGreeting()}, {userName}</p>
                <p className="hidden text-xs text-text-muted sm:block">Keep your next opportunity moving.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <form onSubmit={submitSearch} className={clsx('relative', mobileSearchOpen ? 'absolute inset-x-4 top-20 z-20 sm:static' : 'hidden sm:block')}>
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search jobs" placeholder="Search jobs" className="h-10 w-full rounded-xl border border-border/35 bg-surface-solid/80 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent/70 focus:ring-2 focus:ring-accent/20 sm:w-44 lg:w-60" />
              </form>
              <button type="button" aria-label="Search jobs" onClick={() => setMobileSearchOpen((open) => !open)} className="grid size-10 place-items-center rounded-xl border border-border/35 bg-surface-panel/70 text-text-secondary hover:bg-surface-elevated hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent/60 sm:hidden">
                <Search size={18} aria-hidden="true" />
              </button>
              <AnimatedControl animation={plusCircle} size={19}>
                {(eventProps, iconNode) => (
                  <button type="button" aria-label="Add job" {...eventProps} onClick={(event) => { eventProps.onClick(event); navigate('/jobs/new') }} className="hidden h-10 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-on-accent shadow-glass1 hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-accent/60 sm:flex">
                    {iconNode}
                    <span className="hidden lg:inline">Add Job</span>
                  </button>
                )}
              </AnimatedControl>
              <ThemeToggle />
              <div className="relative">
                <button type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="grid size-10 place-items-center rounded-full border border-border/35 bg-accent/15 text-xs font-semibold text-accent-strong hover:bg-accent/25 focus-visible:ring-2 focus-visible:ring-accent/60">
                  {initials}
                </button>
                {profileOpen && (
                  <div className="glass glass-elevated absolute right-0 top-12 z-30 w-48 rounded-2xl p-2">
                    <p className="truncate px-3 py-2 text-sm font-medium text-text-primary">{userName}</p>
                    <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary">
                      <UserRound size={16} aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
