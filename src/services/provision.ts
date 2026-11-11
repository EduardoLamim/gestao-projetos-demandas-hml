import { validateProfile } from '../domain/auth.ts'
import type { NewUserInput } from '../domain/auth.ts'

export interface ProvisionPort {
  isActiveAdmin(): Promise<boolean>
  createIdentity(email: string, password: string): Promise<string>
  saveProfile(subject: string, input: NewUserInput): Promise<void>
  removeNewIdentity(subject: string): Promise<void>
}

export async function provisionUser(input: NewUserInput, port: ProvisionPort): Promise<void> {
  if (!await port.isActiveAdmin()) throw new Error('Forbidden')
  validateProfile(input)
  const subject = await port.createIdentity(input.email.trim(), input.password)
  try { await port.saveProfile(subject, input) }
  catch {
    // Auth and SQL cannot share a transaction; compensate only the newly created identity.
    try { await port.removeNewIdentity(subject) } catch { throw new Error('Provisioning requires administrator reconciliation') }
    throw new Error('Profile provisioning failed')
  }
}
