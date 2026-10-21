import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em dev, o Django roda em :8000. O proxy mantém tudo na mesma origem,
    // para a sessão e o CSRF funcionarem sem CORS (igual ao Caddy em produção).
    proxy: {
      '/api': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    },
  },
})
