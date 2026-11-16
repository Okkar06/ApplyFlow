import { useState } from 'react'

type Theme = 'light' | 'dark'

const getTheme = (): Theme => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(getTheme)

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('jobtrail-theme', next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="rounded-xl border border-border/40 bg-surface-panel/70 px-3 py-2 text-sm text-text-secondary shadow-glass1 hover:bg-surface-elevated"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
