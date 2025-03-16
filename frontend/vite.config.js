import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // Use '/' for Vercel
  build: {
    outDir: 'dist',
  },
  server: {
    historyApiFallback: true,  // Ensures proper routing in dev mode
  },
  preview: {
    historyApiFallback: true,  // Ensures proper routing in preview mode
  }
})

