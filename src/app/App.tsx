import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../pages/DashboardPage'
import { JobsPage } from '../pages/JobsPage'
import { JobFormPage } from '../pages/JobFormPage'
import { ContactsPage } from '../pages/ContactsPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { ProfilePage } from '../pages/ProfilePage'

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

export const App = () => <RouterProvider router={router} />
