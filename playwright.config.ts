import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4174/ApplyFlow/',
  },
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/ApplyFlow/',
    reuseExistingServer: false,
  },
})
