import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ── Proxy: forwards /api requests to the backend ──────────
    // This means you never hardcode "http://localhost:5000" in the frontend.
    // If the backend port changes, only update it HERE (one place).
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
