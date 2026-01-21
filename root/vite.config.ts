import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'] // Priorità a .tsx
  },
  server: {
    proxy: {
      '/auth/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/users/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/companies/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/customers/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/projects/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/financialData/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/portfolios/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/nfo/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/operations/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/portfolioManaged/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/utils/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/smtp/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/quiz/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
      '/presetsData/api': {
        target: 'http://localhost:4500',
        changeOrigin: true,
      },
    },
  },
})
