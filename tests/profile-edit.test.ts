import { expect, it, vi } from 'vitest'
import { AccessService } from '../src/services/access'
import type { AuthPort, ProfileInput, ProfilesRepository } from '../src/domain/auth'

const draft = { id: 'internal-id', auth_subject: '00000000-0000-4000-8000-000000000001', name: ' Admin ', email: 'admin@example.test', role: 'administrador' as const, active: true, participates_daily: true, updated_at: '2026-11-11T12:00:00Z', expected_updated_at: '2026-11-11T12:00:00Z', periods: [] }
const setup = () => {
  const save = vi.fn()
  return { save, service: new AccessService({} as AuthPort, { save } as unknown as ProfilesRepository) }
}
it('edita perfil completo retornado do banco sem exigir senha', async () => {
  const { service, save } = setup()
  await service.saveProfile(draft)
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Admin', expected_updated_at: draft.updated_at }))
})
it.each([true, false])('salva operador active=%s e expediente alterado', async active => {
  const { service, save } = setup()
  const periods = [{ weekday: 1, starts_at: '09:00', ends_at: '12:00' }, { weekday: 1, starts_at: '13:00', ends_at: '16:00' }]
  await service.saveProfile({ ...draft, role: 'operador', active, periods })
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ active, periods, expected_updated_at: draft.updated_at }))
})
it.each([
  null, { ...draft, name: undefined }, { ...draft, auth_subject: undefined },
  { ...draft, active: undefined }, { ...draft, participates_daily: null },
  { ...draft, periods: undefined }, { ...draft, periods: [null] },
  { ...draft, periods: [{ weekday: 1, ends_at: '12:00' }] },
  { ...draft, expected_updated_at: undefined },
])('rejeita dados incompletos antes do adaptador: %j', async input => {
  const { service, save } = setup()
  await expect(service.saveProfile(input as unknown as ProfileInput)).rejects.not.toThrow(TypeError)
  expect(save).not.toHaveBeenCalled()
})
