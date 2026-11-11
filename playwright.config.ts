import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173/gestao-projetos-demandas-hml/', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/gestao-projetos-demandas-hml/',
    env: { VITE_SUPABASE_URL: 'https://bzuuckljgtaqtdrlpamf.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', VITE_APP_ENV: 'hml', VITE_BASE_PATH: '/gestao-projetos-demandas-hml/' },
  },
})
