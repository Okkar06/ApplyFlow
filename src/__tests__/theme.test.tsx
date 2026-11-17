import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from '../components/ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    const storage: Storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
      key: (index) => [...values.keys()][index] ?? null,
      get length() { return values.size },
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    localStorage.clear()
    document.documentElement.dataset.theme = 'dark'
  })

  it('persists the selected theme when mounted again', async () => {
    const user = userEvent.setup()
    const view = render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('jobtrail-theme')).toBe('light')

    view.unmount()
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()
  })
})
