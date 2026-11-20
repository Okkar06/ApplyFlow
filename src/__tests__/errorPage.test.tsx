import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AppErrorBoundary, NotFoundPage, RouteErrorPage } from '../pages/ErrorPage'

const Boom = ({ message }: { message: string }): never => {
  throw new Error(message)
}

afterEach(() => vi.restoreAllMocks())

describe('AppErrorBoundary', () => {
  it('replaces a crashed app with a recoverable error screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<AppErrorBoundary><Boom message="value.split is not a function" /></AppErrorBoundary>)
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByText(/value\.split is not a function/)).toBeInTheDocument()
  })

  it('explains stale code after a deploy', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<AppErrorBoundary><Boom message="Failed to fetch dynamically imported module: /assets/x.js" /></AppErrorBoundary>)
    expect(screen.getByRole('heading', { name: 'A new version is available' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })

  it('tells the user when they are offline', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<AppErrorBoundary><Boom message="Failed to fetch" /></AppErrorBoundary>)
    expect(screen.getByRole('heading', { name: "You're offline" })).toBeInTheDocument()
  })
})

describe('route errors', () => {
  it('shows the error inside the layout when a page throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createMemoryRouter([
      { path: '/', element: <div>shell</div>, children: [] },
      { path: '/broken', element: <Boom message="page exploded" />, errorElement: <RouteErrorPage /> },
    ], { initialEntries: ['/broken'] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/')
  })

  it('renders a friendly 404 for unknown URLs', async () => {
    const router = createMemoryRouter([{ path: '*', element: <NotFoundPage /> }], { initialEntries: ['/nope'] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: "We couldn't find that page" })).toBeInTheDocument()
    expect(screen.queryByText('Technical details')).not.toBeInTheDocument()
  })
})
