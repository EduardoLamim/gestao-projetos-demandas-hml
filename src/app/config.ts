export function readConfig(env: Record<string, string | undefined>) {
  const url = env.VITE_SUPABASE_URL || ''
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
  const environment = env.VITE_APP_ENV || ''
  if (environment !== 'hml' || url !== 'https://bzuuckljgtaqtdrlpamf.supabase.co') throw new Error('Configuração de homologação indisponível. Contate o administrador.')
  let publicKey = /^sb_publishable_[\w-]+$/.test(key)
  if (key.startsWith('eyJ')) {
    try { publicKey = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon' } catch { publicKey = false }
  }
  if (!publicKey) throw new Error('Chave pública de homologação não configurada.')
  return { url, key, environment }
}
