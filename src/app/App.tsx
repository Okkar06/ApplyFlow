import { useEffect, useState } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../pages/DashboardPage'
import { JobsPage } from '../pages/JobsPage'
import { JobFormPage } from '../pages/JobFormPage'
import { ContactsPage } from '../pages/ContactsPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AuthPage } from '../pages/AuthPage'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'jobs/new', element: <JobFormPage /> },
      { path: 'jobs/:id/edit', element: <JobFormPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])

export const App = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error(error)
      if (active) {
        setSession(data.session)
        setLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <main className="p-6 text-sm text-text-secondary">Loading...</main>
  if (!session) return <AuthPage />
  return <RouterProvider router={router} />
}
