import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const ids = { admin: '00000000-0000-4000-8000-000000000001', operator: '00000000-0000-4000-8000-000000000002', manager: '00000000-0000-4000-8000-000000000003', inactive: '00000000-0000-4000-8000-000000000004', newUser: '00000000-0000-4000-8000-000000000005' }
async function asUser(subject: string, sql: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${subject}', false);`)
  try { return await db.query(sql) } finally { await db.exec('reset role') }
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
  await db.exec('create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$ begin end $$;')
  for (const migration of readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort()) await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'))
  for (const [name, id] of Object.entries(ids)) await db.query('insert into auth.users values ($1,$2)', [id, `${name}@example.test`])
  for (const [name, role, active] of [['admin','administrador',true], ['operator','operador',true], ['manager','gestao',true], ['inactive','operador',false]] as const) {
    await db.query('insert into public.profiles(auth_subject,name,email,role,active) values($1,$2,$3,$4,$5)', [ids[name], name, `${name}@example.test`, role, active])
  }
})
afterAll(() => db.close())

describe('PostgreSQL grants, RLS e RPC reais', () => {
  it('mantém trigger da plataforma sem expor execução direta', async () => {
    const result = await db.query<{ allowed: boolean }>("select has_function_privilege('anon','public.rls_auto_enable()','execute') or has_function_privilege('authenticated','public.rls_auto_enable()','execute') as allowed")
    expect(result.rows[0].allowed).toBe(false)
  })
  it('nega leitura anônima', async () => {
    await db.exec('set role anon')
    try { await expect(db.query('select * from profiles')).rejects.toThrow(/permission denied/) } finally { await db.exec('reset role') }
  })
  it('operador e gestão leem apenas o próprio perfil; administrador lê todos', async () => {
    expect((await asUser(ids.operator, 'select * from profiles')).rows).toHaveLength(1)
    expect((await asUser(ids.manager, 'select * from profiles')).rows).toHaveLength(1)
    expect((await asUser(ids.admin, 'select * from profiles')).rows).toHaveLength(4)
  })
  it('inativo e identidade sem perfil não leem dados', async () => {
    expect((await asUser(ids.inactive, 'select * from profiles')).rows).toHaveLength(0)
    expect((await asUser(ids.newUser, 'select * from profiles')).rows).toHaveLength(0)
  })
  it('nega escalonamento, criação direta e alteração de identidade', async () => {
    for (const sql of ["update profiles set role='administrador'", "insert into profiles(auth_subject,name,email) values(gen_random_uuid(),'x','x@test')", 'update profiles set auth_subject=gen_random_uuid()', 'delete from profiles']) {
      await expect(asUser(ids.operator, sql)).rejects.toThrow(/permission denied/)
    }
    await expect(asUser(ids.manager, `select save_profile('${ids.newUser}','New','administrador',true,true,'[]')`)).rejects.toThrow(/Forbidden/)
  })
  it('auditoria não pode ser fabricada, alterada ou excluída; operador não lê', async () => {
    expect((await asUser(ids.operator, 'select * from audit_events')).rows).toHaveLength(0)
    for (const sql of ["insert into audit_events(record_id,event_type,changes) values(gen_random_uuid(),'fake','{}')", "update audit_events set event_type='fake'", 'delete from audit_events']) await expect(asUser(ids.admin, sql)).rejects.toThrow(/permission denied/)
  })
  it('administrador cadastra perfil e múltiplos períodos atomicamente', async () => {
    await asUser(ids.admin, `select save_profile('${ids.newUser}','Novo usuário','operador',true,true,'[{"weekday":1,"starts_at":"08:00","ends_at":"12:00"},{"weekday":1,"starts_at":"13:00","ends_at":"17:00"}]')`)
    expect((await asUser(ids.newUser, 'select * from work_periods')).rows).toHaveLength(2)
    expect((await asUser(ids.operator, 'select * from work_periods')).rows).toHaveLength(0)
    const audit = await asUser(ids.admin, "select * from audit_events where event_type='profile.work_periods'")
    expect(audit.rows).toHaveLength(1)
    expect((audit.rows[0] as { actor_id: string }).actor_id).not.toBeNull()
  })
  it('rejeita atualização concorrente e expediente inválido sem perda', async () => {
    await expect(asUser(ids.admin, `select save_profile('${ids.newUser}','Oops','operador',true,true,'[]')`)).rejects.toThrow(/Concurrent change/)
    const row = (await db.query<{ updated_at: string }>('select updated_at::text from profiles where auth_subject=$1', [ids.newUser])).rows[0]
    await expect(asUser(ids.admin, `select save_profile('${ids.newUser}','Oops','operador',true,true,'[{"weekday":1,"starts_at":"08:00","ends_at":"12:00"},{"weekday":1,"starts_at":"11:00","ends_at":"17:00"}]','${row.updated_at}')`)).rejects.toThrow(/Overlapping/)
    expect((await asUser(ids.newUser, 'select * from work_periods')).rows).toHaveLength(2)
  })
  it('não permite retirar o próprio acesso administrativo', async () => {
    await expect(asUser(ids.admin, `select save_profile('${ids.admin}','Admin','operador',true,true,'[]')`)).rejects.toThrow(/own administrative/)
    await expect(asUser(ids.admin, `select save_profile('${ids.admin}','Admin','administrador',false,true,'[]')`)).rejects.toThrow(/own administrative/)
  })
  it('desativação bloqueia token existente na próxima consulta', async () => {
    const row = (await db.query<{ updated_at: string }>('select updated_at::text from profiles where auth_subject=$1', [ids.newUser])).rows[0]
    await asUser(ids.admin, `select save_profile('${ids.newUser}','Novo usuário','operador',false,true,'[]','${row.updated_at}')`)
    expect((await asUser(ids.newUser, 'select * from profiles')).rows).toHaveLength(0)
    expect((await asUser(ids.newUser, 'select * from work_periods')).rows).toHaveLength(0)
    await expect(asUser(ids.newUser, `select save_profile('${ids.newUser}','Novo','administrador',true,true,'[]')`)).rejects.toThrow(/Forbidden/)
  })
  it('reativa perfil e altera expediente com auditoria e controle de versão', async () => {
    const row = (await db.query<{ updated_at: string }>('select updated_at::text from profiles where auth_subject=$1', [ids.newUser])).rows[0]
    await asUser(ids.admin, `select save_profile('${ids.newUser}','Nome alterado','operador',true,true,'[{"weekday":2,"starts_at":"10:00","ends_at":"14:00"}]','${row.updated_at}')`)
    expect((await asUser(ids.newUser, 'select name from profiles')).rows).toEqual([{ name: 'Nome alterado' }])
    expect((await asUser(ids.newUser, 'select weekday,starts_at::text from work_periods')).rows).toEqual([{ weekday: 2, starts_at: '10:00:00' }])
    await expect(asUser(ids.admin, `select save_profile('${ids.newUser}','Stale','operador',false,true,'[]','${row.updated_at}')`)).rejects.toThrow(/Concurrent change/)
    const audit = await asUser(ids.admin, "select changes from audit_events where event_type='profile.updated' order by occurred_at desc limit 1")
    expect(audit.rows).toHaveLength(1)
  })
})
