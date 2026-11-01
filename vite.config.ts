/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_API_TARGET (no .env.local) escolhe qual Django o proxy usa em dev:
  // o local (:8000) ou o da VM (https://apicrm.meialuadbarreto.com.br).
  const target = loadEnv(mode, process.cwd(), '').VITE_API_TARGET || 'http://localhost:8000'
  const proxy = {
    target,
    changeOrigin: true,
    // O Django da VM confere o Origin no CSRF: o pedido sai como se viesse dele mesmo.
    headers: { origin: target },
    // Cookies voltam sem Domain, para o navegador guardá-los em localhost.
    cookieDomainRewrite: '',
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // O proxy mantém tudo na mesma origem, para a sessão e o CSRF funcionarem
      // sem CORS (igual ao Netlify/Caddy em produção).
      proxy: {
        '/api': proxy,
        '/django-admin': proxy,
        '/static': proxy,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
