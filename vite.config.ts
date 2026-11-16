import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ApplyFlow/',
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
