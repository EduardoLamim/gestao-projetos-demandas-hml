import { expect, test } from '@playwright/test'

test('login responsivo, erro seguro e nenhuma marca corporativa', async ({ page }) => {
  await page.route('**/auth/v1/token*', route => route.fulfill({ status: 400, json: { message: 'Invalid credentials' } }))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Entre no seu espaço' })).toBeVisible()
  await page.screenshot({ path: `test-results/login-${test.info().project.name}.png`, fullPage: true })
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('fictitious-test-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível entrar')
  await expect(page.locator('body')).not.toContainText(/\bJBS\b/i)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('rota protegida e refresh não revelam administração', async ({ page }) => {
  await page.goto('./#/usuarios')
  await expect(page.getByRole('heading', { name: 'Entre no seu espaço' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Entre no seu espaço' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Usuários e permissões' })).toHaveCount(0)
})

test('não oferece autocadastro ou recuperação por e-mail', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'password')
  await expect(page.getByText(/Criar conta|Esqueci minha senha|Receber código/)).toHaveCount(0)
})

test('login, sessão, perfil e logout com transporte simulado', async ({ page }) => {
  const subject = '00000000-0000-4000-8000-000000000002'
  const now = Math.floor(Date.now() / 1000)
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: subject, exp: now + 3600, iat: now, role: 'authenticated' })).toString('base64url')}.fixture`
  const profile = { id: subject, auth_subject: subject, name: 'Pessoa de teste', email: 'teste@example.test', role: 'operador', active: true, participates_daily: true, updated_at: new Date().toISOString() }
  await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, json: { access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: { id: subject, email: profile.email, aud: 'authenticated' } } }))
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, json: [profile] }))
  await page.route('**/auth/v1/logout*', route => route.fulfill({ status: 204 }))
  await page.goto('./')
  await page.getByLabel('E-mail', { exact: true }).fill(profile.email)
  await page.getByLabel('Senha', { exact: true }).fill('fictitious-test-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bem-vindo, Pessoa.' })).toBeVisible()
  await page.screenshot({ path: `test-results/access-${test.info().project.name}.png`, fullPage: true })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Bem-vindo, Pessoa.' })).toBeVisible()
  await page.goto('./#/usuarios')
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Entre no seu espaço' })).toBeVisible()
})
