import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './app/App'
import { AppErrorBoundary, SetupRequiredPage } from './pages/ErrorPage'
import { missingSupabaseConfig } from './lib/supabase'
import './index.css'

if (window.top !== window.self) {
  try {
    window.top!.location.replace(window.self.location.href)
  } catch {
    window.location.replace(window.location.href)
  }
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      {missingSupabaseConfig.length ? (
        <SetupRequiredPage missing={missingSupabaseConfig} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      )}
    </AppErrorBoundary>
  </StrictMode>,
)
