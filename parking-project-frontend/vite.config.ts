// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      dayjs: 'dayjs'
    }
  },
  define: {
    // This will replace references to `global` with an empty object
    global: {},
  },
})
