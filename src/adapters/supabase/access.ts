import { createClient } from '@supabase/supabase-js'
import type { AuthPort, Profile, ProfilesRepository } from '../../domain/auth'
import { AccessService } from '../../services/access'

export function createAccess(url: string, key: string): AccessService {
  const client = createClient(url, key, { auth: {
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
    storage: window.sessionStorage, storageKey: 'gpd-hml-auth',
  } })
  const auth: AuthPort = {
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Não foi possível entrar. Confira suas credenciais ou tente novamente mais tarde.')
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw new Error('Não foi possível encerrar a sessão. Tente novamente.')
    },
    async currentSubject() {
      const { data, error } = await client.auth.getSession()
      if (error) throw new Error('Não foi possível verificar a sessão.')
      return data.session?.user.id || null
    },
    onChange(callback) {
      const { data } = client.auth.onAuthStateChange(() => { window.setTimeout(callback, 0) })
      return () => data.subscription.unsubscribe()
    },
  }
  const profiles: ProfilesRepository = {
    async current(subject) {
      const { data, error } = await client.from('profiles').select('*').eq('auth_subject', subject).maybeSingle()
      if (error) throw new Error('Não foi possível consultar seu acesso. Tente novamente.')
      return data as Profile | null
    },
    async list() {
      const { data, error } = await client.from('profiles').select('*').order('name')
      if (error) throw new Error('Não foi possível carregar os usuários.')
      return data as Profile[]
    },
    async periods(profileId) {
      const { data, error } = await client.from('work_periods').select('weekday,starts_at,ends_at').eq('profile_id', profileId).order('weekday').order('starts_at')
      if (error) throw new Error('Não foi possível carregar o expediente.')
      return data
    },
    async save(input) {
      const { error } = await client.rpc('save_profile', { p_subject: input.auth_subject, p_name: input.name, p_role: input.role, p_active: input.active, p_participates: input.participates_daily, p_periods: input.periods, p_expected_updated_at: input.expected_updated_at })
      if (error) throw new Error(error.code === '40001' ? 'Este usuário foi alterado por outra pessoa. Recarregue antes de salvar.' : 'Não foi possível salvar. Verifique sua permissão, o usuário cadastrado no Auth e os horários.')
    },
    async create(input) {
      const { error } = await client.functions.invoke('create-user', { body: input })
      if (error) throw new Error('Não foi possível cadastrar. Confira os dados, sua permissão e se o e-mail já está cadastrado.')
    },
  }
  return new AccessService(auth, profiles)
}
