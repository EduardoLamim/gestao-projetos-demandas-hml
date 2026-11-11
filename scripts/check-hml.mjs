import assert from 'node:assert/strict'

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key, HML_SECURITY_VERIFIED: approved } = process.env
assert.equal(url, 'https://bzuuckljgtaqtdrlpamf.supabase.co', 'Destino HML incorreto')
assert.equal(approved, 'true', 'A inspeção de migrations, Auth, grants e RLS deve ser concluída antes da publicação')
assert.ok(key && key.startsWith('sb_publishable_'), 'Configure uma chave publishable no GitHub Environment hml')
for (const table of ['profiles', 'work_periods', 'audit_events']) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) })
  const body = await response.json()
  assert.ok([401, 403].includes(response.status) && body.code === '42501', `Acesso anônimo não foi negado por privilégio em ${table}; publicação bloqueada`)
}
console.log('Destino HML e negação de acesso anônimo verificados. A liberação depende também dos testes autenticados e da inspeção SQL registrados.')
