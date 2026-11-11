import type { AuthPort, NewUserInput, Profile, ProfileInput, ProfilesRepository } from '../domain/auth'
import { validateProfile } from '../domain/auth'

export class AccessService {
  constructor(readonly auth: AuthPort, readonly profiles: ProfilesRepository) {}
  async current(): Promise<Profile | null> {
    const subject = await this.auth.currentSubject()
    if (!subject) return null
    const profile = await this.profiles.current(subject)
    if (!profile?.active) {
      await this.auth.signOut()
      throw new Error('Acesso não autorizado. Solicite a liberação ao administrador.')
    }
    return profile
  }
  async saveProfile(input: ProfileInput): Promise<void> {
    validateProfile(input)
    await this.profiles.save({ ...input, name: input.name.trim() })
  }
  async createUser(input: NewUserInput): Promise<void> {
    validateProfile(input)
    await this.profiles.create({ ...input, name: input.name.trim(), email: input.email.trim() })
  }
}
