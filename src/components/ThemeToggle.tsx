import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

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
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="grid size-10 place-items-center rounded-xl border border-border/40 bg-surface-panel/70 text-text-secondary shadow-glass1 hover:bg-surface-elevated hover:text-text-primary"
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}
