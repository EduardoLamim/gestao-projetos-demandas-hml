export const roles = ['administrador', 'gestao', 'operador'] as const
export type Role = typeof roles[number]
export const roleLabels: Record<Role, string> = { administrador: 'Administrador', gestao: 'Gestão', operador: 'Operador' }
export type WorkPeriod = { weekday: number; starts_at: string; ends_at: string }
export type Profile = {
  id: string; auth_subject: string; name: string; email: string; role: Role;
  active: boolean; participates_daily: boolean; updated_at: string
}
export type ProfileInput = Pick<Profile, 'auth_subject' | 'name' | 'role' | 'active' | 'participates_daily'> & { periods: WorkPeriod[]; expected_updated_at: string | null }

export interface AuthPort {
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  currentSubject(): Promise<string | null>
  onChange(callback: () => void): () => void
}
export interface ProfilesRepository {
  current(subject: string): Promise<Profile | null>
  list(): Promise<Profile[]>
  periods(profileId: string): Promise<WorkPeriod[]>
  save(input: ProfileInput): Promise<void>
  create(input: NewUserInput): Promise<void>
}
export type NewUserInput = Omit<ProfileInput, 'auth_subject' | 'expected_updated_at'> & { email: string; password: string }

export function validateProfile(input: ProfileInput | NewUserInput): void {
  if (!input.name.trim() || input.name.trim().length > 120) throw new Error('Informe um nome de até 120 caracteres.')
  if ('auth_subject' in input && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.auth_subject)) throw new Error('Informe o identificador válido do usuário autenticado.')
  if ('email' in input && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254 || input.password.length < 12 || new TextEncoder().encode(input.password).length > 72)) throw new Error('Informe e-mail válido e senha de pelo menos 12 caracteres e até 72 bytes.')
  if (!roles.includes(input.role)) throw new Error('Perfil inválido.')
  for (const period of input.periods) {
    if (!Number.isInteger(period.weekday) || period.weekday < 0 || period.weekday > 6 ||
      !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(period.starts_at) || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(period.ends_at) ||
      period.starts_at.slice(0, 5) >= period.ends_at.slice(0, 5)) throw new Error('Revise os dias e horários de expediente.')
  }
  for (let i = 0; i < input.periods.length; i++) for (let j = i + 1; j < input.periods.length; j++) {
    const a = input.periods[i], b = input.periods[j]
    if (a.weekday === b.weekday && a.starts_at < b.ends_at && b.starts_at < a.ends_at) throw new Error('Horários de expediente não podem se sobrepor.')
  }
}
