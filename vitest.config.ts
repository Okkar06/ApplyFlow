import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/vitest.setup.ts',
    // tests/ holds Playwright specs, run separately with `npm run test:e2e`
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**', 'graphify-out/**'],
  },
})
