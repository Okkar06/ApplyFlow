import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const extensionDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: extensionDir,
  envDir: resolve(extensionDir, '..'),
  build: {
    outDir: resolve(extensionDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(extensionDir, 'popup.html'),
        content: resolve(extensionDir, 'content.ts'),
        background: resolve(extensionDir, 'background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
})
