import { expect, it, vi } from 'vitest'
import { provisionUser } from '../src/services/provision'
const input = { name: 'Teste', email: 'test@example.test', password: 'fictitious-test-password', role: 'operador' as const, active: true, participates_daily: true, periods: [] }
const port = () => ({ isActiveAdmin: vi.fn().mockResolvedValue(true), createIdentity: vi.fn().mockResolvedValue('new-id'), saveProfile: vi.fn(), removeNewIdentity: vi.fn() })
it('nega não administrador antes de criar identidade', async () => {
  const p = port(); p.isActiveAdmin.mockResolvedValue(false)
  await expect(provisionUser(input, p)).rejects.toThrow('Forbidden')
  expect(p.createIdentity).not.toHaveBeenCalled()
})
it('rejeita senha curta antes de criar identidade', async () => {
  const p = port()
  await expect(provisionUser({ ...input, password: 'short' }, p)).rejects.toThrow()
  expect(p.createIdentity).not.toHaveBeenCalled()
})
it('compensa exclusivamente identidade recém-criada se SQL falhar', async () => {
  const p = port(); p.saveProfile.mockRejectedValue(new Error('failure'))
  await expect(provisionUser(input, p)).rejects.toThrow('Profile provisioning failed')
  expect(p.removeNewIdentity).toHaveBeenCalledWith('new-id')
})
it('não remove identidade quando criação falha ou cadastro termina', async () => {
  const p = port(); await provisionUser(input, p)
  expect(p.removeNewIdentity).not.toHaveBeenCalled()
  p.createIdentity.mockRejectedValue(new Error('duplicate'))
  await expect(provisionUser(input, p)).rejects.toThrow('duplicate')
  expect(p.removeNewIdentity).not.toHaveBeenCalled()
})
