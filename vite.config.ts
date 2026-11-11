import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwind(), {
    name: 'production-security-policy', apply: 'build',
    transformIndexHtml() { return [{ tag: 'meta', attrs: {
      'http-equiv': 'Content-Security-Policy',
      content: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src https://bzuuckljgtaqtdrlpamf.supabase.co; object-src 'none'; base-uri 'self'; form-action 'none'",
    }, injectTo: 'head-prepend' }] },
  }],
  base: process.env.VITE_BASE_PATH || '/',
  test: { include: ['tests/**/*.test.ts'], testTimeout: 20000 },
})
