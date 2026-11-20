import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from the domain root on Vercel. Set VITE_BASE_PATH (e.g. "/ApplyFlow/")
// only when hosting under a sub-path.
const base = process.env.VITE_BASE_PATH?.trim() || '/'

export default defineConfig({
  base: base.endsWith('/') ? base : `${base}/`,
  // NEXT_PUBLIC_* is what Vercel's Supabase integration creates for browser-safe
  // values. Never add a prefix like SUPABASE_: that would expose secret keys.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    react(),
    {
      name: 'development-csp',
      transformIndexHtml(html, context) {
        return html.replace('__DEV_STYLE_CSP__', context.server ? "'unsafe-inline'" : '')
      },
    },
  ],
})
