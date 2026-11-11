import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { provisionUser } from '../../../src/services/provision.ts'
import type { NewUserInput } from '../../../src/domain/auth.ts'

const allowedOrigins = new Set(['https://eduardolamim.github.io', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'])
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') || ''
  const cors = { 'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : '', 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  const respond = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  if (origin && !allowedOrigins.has(origin)) return respond(403, 'Forbidden')
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return respond(405, 'Method not allowed')
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return respond(401, 'Unauthorized')
  const url = Deno.env.get('SUPABASE_URL')!
  if (url !== 'https://bzuuckljgtaqtdrlpamf.supabase.co') return respond(503, 'Environment unavailable')
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const { data: { user }, error: authError } = await caller.auth.getUser(authorization.slice(7))
  if (authError || !user) return respond(401, 'Unauthorized')
  const { data: profile } = await caller.from('profiles').select('role,active').eq('auth_subject', user.id).maybeSingle()
  if (!profile?.active || profile.role !== 'administrador') return respond(403, 'Forbidden')
  const body = await request.text()
  if (body.length > 16384) return respond(413, 'Request too large')
  let input: NewUserInput
  try {
    input = JSON.parse(body)
    if (!input || typeof input.name !== 'string' || typeof input.email !== 'string' || typeof input.password !== 'string' || typeof input.active !== 'boolean' || typeof input.participates_daily !== 'boolean' || !Array.isArray(input.periods) || input.periods.length > 28 || input.periods.some(p => !p || typeof p.starts_at !== 'string' || typeof p.ends_at !== 'string')) return respond(400, 'Invalid input')
  } catch { return respond(400, 'Invalid input') }
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  try {
    await provisionUser(input, {
      async isActiveAdmin() { return true }, // JWT and database role checked above; RPC rechecks before saving.
      async createIdentity(email, password) {
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
        if (error || !data.user) throw new Error('Identity creation failed')
        return data.user.id
      },
      async saveProfile(subject, data) {
        const { error } = await caller.rpc('save_profile', { p_subject: subject, p_name: data.name, p_role: data.role, p_active: data.active, p_participates: data.participates_daily, p_periods: data.periods, p_expected_updated_at: null })
        if (error) throw new Error('Profile creation failed')
      },
      async removeNewIdentity(subject) {
        const { error } = await admin.auth.admin.deleteUser(subject)
        if (error) throw new Error('Compensation failed')
      },
    })
    return respond(201, 'Created')
  } catch (error) {
    if (error instanceof Error && error.message.includes('reconciliation')) return respond(500, 'Provisioning requires administrator reconciliation')
    return respond(400, 'Unable to create user')
  }
})
