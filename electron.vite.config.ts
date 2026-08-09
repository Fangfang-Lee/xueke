import { join } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: join(__dirname, 'electron/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: join(__dirname, 'electron/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: join(__dirname),
    resolve: {
      alias: {
        '@renderer': join('src'),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: join(__dirname, 'index.html'),
      },
    },
  },
})
