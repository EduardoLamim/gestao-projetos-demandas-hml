import { describe, expect, it, vi } from 'vitest'
import { readConfig } from '../src/app/config'
import { validateProfile } from '../src/domain/auth'
import type { AuthPort, ProfilesRepository } from '../src/domain/auth'
import { AccessService } from '../src/services/access'

describe('configuração e serviços', () => {
  const env = { VITE_APP_ENV: 'hml', VITE_SUPABASE_URL: 'https://bzuuckljgtaqtdrlpamf.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }
  it('aceita somente destino HML autorizado e chave pública', () => {
    expect(readConfig(env).environment).toBe('hml')
    expect(() => readConfig({ ...env, VITE_APP_ENV: 'prd' })).toThrow()
    expect(() => readConfig({ ...env, VITE_SUPABASE_URL: 'https://other.supabase.co' })).toThrow()
    expect(() => readConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' })).toThrow()
    const privileged = `eyJ.${btoa(JSON.stringify({ role: 'service_role' }))}.fake`
    expect(() => readConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: privileged })).toThrow()
  })
  it('nega identidade sem perfil ativo e encerra sessão', async () => {
    const auth = { currentSubject: vi.fn().mockResolvedValue('id'), signOut: vi.fn() } as unknown as AuthPort
    const profiles = { current: vi.fn().mockResolvedValue(null) } as unknown as ProfilesRepository
    await expect(new AccessService(auth, profiles).current()).rejects.toThrow('Acesso não autorizado')
    expect(auth.signOut).toHaveBeenCalledOnce()
  })
  it('não consulta perfil quando não existe sessão', async () => {
    const auth = { currentSubject: vi.fn().mockResolvedValue(null) } as unknown as AuthPort
    const profiles = { current: vi.fn() } as unknown as ProfilesRepository
    expect(await new AccessService(auth, profiles).current()).toBeNull()
    expect(profiles.current).not.toHaveBeenCalled()
  })
  it('rejeita sobreposição de expediente e aceita jornada parcial', () => {
    const input = { auth_subject: '00000000-0000-4000-8000-000000000001', name: 'Teste', role: 'operador' as const, active: true, participates_daily: true, expected_updated_at: null, periods: [{ weekday: 1, starts_at: '08:00', ends_at: '12:00' }] }
    expect(() => validateProfile(input)).not.toThrow()
    expect(() => validateProfile({ ...input, periods: [...input.periods, { weekday: 1, starts_at: '11:00', ends_at: '13:00' }] })).toThrow('sobrepor')
  })
})
