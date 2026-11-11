import { expect, it, vi, afterEach } from 'vitest'
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })
it('bloqueia publicação sem inspeção aprovada', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://bzuuckljgtaqtdrlpamf.supabase.co')
  vi.stubEnv('HML_SECURITY_VERIFIED', '')
  await expect(import('../scripts/check-hml.mjs')).rejects.toThrow('inspeção')
})
it('bloqueia publicação quando API permite leitura anônima', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://bzuuckljgtaqtdrlpamf.supabase.co')
  vi.stubEnv('HML_SECURITY_VERIFIED', 'true')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { status: 200 })))
  await expect(import('../scripts/check-hml.mjs')).rejects.toThrow('publicação bloqueada')
})
