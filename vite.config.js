import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/Dyanpitt/' : '/',
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    strictPort: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
}))
