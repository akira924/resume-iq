import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin API calls so the httpOnly auth cookie just works in dev.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
