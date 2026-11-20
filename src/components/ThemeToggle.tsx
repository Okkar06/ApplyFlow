import { useState } from 'react'
import sun from 'react-useanimations/lib/sun'
import moon from 'react-useanimations/lib/moon'
import { AnimatedControl } from './ui/AnimatedIcon'

type Theme = 'light' | 'dark'

const getTheme = (): Theme => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('jobtrail-theme', theme)
  } catch {
    // storage unavailable (private mode); the theme still applies for this visit
  }
}

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(getTheme)

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`
  return (
    <AnimatedControl key={theme} animation={theme === 'dark' ? sun : moon} size={20}>
      {(eventProps, icon) => (
        <button
          type="button"
          {...eventProps}
          onClick={(event) => {
            eventProps.onClick(event)
            toggle()
          }}
          aria-label={label}
          title={label}
          className="grid size-10 place-items-center rounded-xl border border-border/40 bg-surface-panel/70 text-text-secondary shadow-glass1 hover:bg-surface-elevated hover:text-text-primary"
        >
          {icon}
        </button>
      )}
    </AnimatedControl>
  )
}
