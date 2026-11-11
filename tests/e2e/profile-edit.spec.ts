import { expect, test } from '@playwright/test'

test('edição percorre formulário, serviço e adaptador até RPC sem senha', async ({ page }) => {
  const subject = '00000000-0000-4000-8000-000000000001'
  const operator = '00000000-0000-4000-8000-000000000002'
  const stamp = '2026-11-11T12:00:00.123456+00:00'
  const profiles = [
    { id: subject, auth_subject: subject, name: 'Admin teste', email: 'admin@example.test', role: 'administrador', active: true, participates_daily: true, updated_at: stamp },
    { id: operator, auth_subject: operator, name: 'Operador teste', email: 'operator@example.test', role: 'operador', active: true, participates_daily: true, updated_at: stamp },
  ]
  const now = Math.floor(Date.now() / 1000)
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: subject, exp: now + 3600, role: 'authenticated' })).toString('base64url')}.fixture`
  await page.route('**/auth/v1/token*', route => route.fulfill({ json: { access_token: token, refresh_token: 'fixture', token_type: 'bearer', expires_in: 3600, user: { id: subject, email: profiles[0].email } } }))
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ json: route.request().url().includes('auth_subject=') ? [profiles[0]] : profiles }))
  let incomplete = false
  await page.route('**/rest/v1/work_periods*', route => route.fulfill({ json: incomplete ? [{ weekday: 1, ends_at: '12:00' }] : [] }))
  const calls: Record<string, unknown>[] = []
  await page.route('**/rest/v1/rpc/save_profile', route => {
    const body = route.request().postDataJSON()
    calls.push(body)
    const profile = profiles.find(p => p.auth_subject === body.p_subject)!
    profile.active = body.p_active
    return route.fulfill({ json: profile.id })
  })
  await page.goto('./#/usuarios')
  await page.getByLabel('E-mail', { exact: true }).fill(profiles[0].email)
  await page.getByLabel('Senha', { exact: true }).fill('fixture-password-only')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  for (const [name, active] of [['Admin teste', true], ['Operador teste', false], ['Operador teste', true]] as const) {
    await page.getByRole('button', { name: `Editar ${name}`, exact: true }).click()
    await page.getByLabel('Acesso ativo').setChecked(active)
    await page.getByRole('button', { name: 'Adicionar período' }).click()
    await page.getByLabel('Início do período 1').fill('09:00')
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Usuário salvo')
    expect(calls.at(-1)).toEqual({ p_subject: name === 'Admin teste' ? subject : operator, p_name: name, p_role: name === 'Admin teste' ? 'administrador' : 'operador', p_active: active, p_participates: true, p_periods: [{ weekday: 1, starts_at: '09:00', ends_at: '12:00' }], p_expected_updated_at: stamp })
  }
  incomplete = true
  await page.getByRole('button', { name: 'Editar Operador teste', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('dados completos')
  expect(calls).toHaveLength(3)
  await expect(page.getByRole('button', { name: 'Salvar usuário', exact: true })).toHaveCount(0)
})
