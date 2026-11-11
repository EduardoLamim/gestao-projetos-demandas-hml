import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Profile } from '../domain/auth'
import { roleLabels } from '../domain/auth'
import type { AccessService } from '../services/access'
import { Users } from '../features/Users'

const areas = ['Visão Gerencial', 'Projetos', 'Demandas', 'Kanban', 'Daily'] as const
type Route = 'inicio' | 'usuarios'
function currentRoute(): Route { return window.location.hash === '#/usuarios' ? 'usuarios' : 'inicio' }
function message(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível concluir a operação.' }

export function App({ access }: { access: AccessService }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [route, setRoute] = useState<Route>(currentRoute)
  const generation = useRef({ value: 0 })
  const refresh = useCallback(async () => {
    const request = ++generation.current.value
    try {
      const next = await access.current()
      if (request === generation.current.value) setProfile(next)
    } catch (err) {
      if (request === generation.current.value) { setProfile(null); setError(message(err)) }
    } finally { if (request === generation.current.value) setLoading(false) }
  }, [access])
  useEffect(() => {
    const requests = generation.current
    const initial = window.setTimeout(() => { void refresh() }, 0)
    const unsubscribe = access.auth.onChange(() => { void refresh() })
    const interval = window.setInterval(() => { void refresh() }, 60000)
    const focus = () => { void refresh() }
    const navigate = () => setRoute(currentRoute())
    window.addEventListener('focus', focus)
    window.addEventListener('hashchange', navigate)
    return () => { requests.value++; clearTimeout(initial); unsubscribe(); clearInterval(interval); window.removeEventListener('focus', focus); window.removeEventListener('hashchange', navigate) }
  }, [access, refresh])

  if (loading) return <main className="setup" role="status">Verificando acesso…</main>
  if (!profile) return <Login access={access} error={error} onError={setError} onSuccess={refresh} />
  return <div className="workspace">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <aside className="sidebar">
      <a href="#/inicio" className="brand">Gestão de Projetos<br /><span>&amp; Demandas</span></a>
      <span className="environment">Homologação</span>
      <nav aria-label="Navegação principal">
        {areas.map((area, index) => <div className="nav-entry" key={area}><span className="nav-index">0{index + 1}</span><span>{area}</span><span className="soon">Em breve</span></div>)}
      </nav>
      <div className="secondary-nav"><a href="#/inicio" aria-current={route === 'inicio' ? 'page' : undefined}>Meu acesso</a>{profile.role === 'administrador' && <a href="#/usuarios" aria-current={route === 'usuarios' ? 'page' : undefined}>Usuários e permissões</a>}</div>
      <div className="sidebar-footer">Suporte e infraestrutura<br /><span>Ambiente de validação</span></div>
    </aside>
    <div className="page">
      <header className="topbar"><span>Espaço de trabalho</span><div><span>{profile.name}</span><button className="text-button" onClick={async () => { try { await access.auth.signOut(); setProfile(null); setError('') } catch (err) { setError(message(err)) } }}>Sair</button></div></header>
      <main id="conteudo" className="content">
        {error && <p role="alert" className="error">{error}</p>}
        {route === 'usuarios' ? profile.role === 'administrador' ? <Users access={access} /> : <><h1>Acesso restrito</h1><p>Somente administradores podem gerenciar usuários.</p><a href="#/inicio">Voltar ao meu acesso</a></> : <>
          <div className="page-heading"><span className="eyebrow">Meu acesso</span><h1>Bem-vindo, {profile.name.split(' ')[0]}.</h1><p>Seu acesso ao ambiente de homologação está ativo.</p></div>
          <section className="profile-section" aria-labelledby="account-title"><h2 id="account-title">Informações da conta</h2><dl className="profile-details"><div><dt>Nome</dt><dd>{profile.name}</dd></div><div><dt>E-mail</dt><dd>{profile.email}</dd></div><div><dt>Perfil de acesso</dt><dd>{roleLabels[profile.role]}</dd></div><div><dt>Participação nas Dailies</dt><dd>{profile.participates_daily ? 'Habilitada' : 'Desabilitada'}</dd></div></dl></section>
          <section className="foundation-note"><span className="eyebrow">Fundação HML</span><h2>Um ponto de partida para o trabalho da equipe.</h2><p>Este ambiente está em homologação. As áreas de acompanhamento serão disponibilizadas nas próximas etapas.</p><p>Use apenas dados fictícios durante a validação.</p></section>
        </>}
      </main>
      <footer className="page-footer">Gestão de Projetos &amp; Demandas <span>HML · Fundação</span></footer>
    </div>
  </div>
}

function Login({ access, error, onError, onSuccess }: { access: AccessService; error: string; onError: (value: string) => void; onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); onError('')
    try {
      await access.auth.signIn(email.trim(), password)
      setPassword('')
      await onSuccess()
    } catch (err) { onError(message(err)) } finally { setBusy(false) }
  }
  return <main className="login-layout"><section className="login-intro"><span className="environment">Homologação</span><div><span className="eyebrow">Suporte e infraestrutura</span><h1>Gestão de Projetos<br /><span>&amp; Demandas</span></h1><p>Clareza para acompanhar.<br />Contexto para decidir.</p></div><span className="intro-footer">Um espaço para o trabalho da equipe.</span></section>
    <section className="login-panel"><form onSubmit={submit} className="login-form"><span className="eyebrow">Acesso à plataforma</span><h2>Entre no seu espaço</h2><p>Use o e-mail e a senha cadastrados pelo administrador.</p>
      <label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" required maxLength={128} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} />
      {error && <p role="alert" className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Aguarde…' : 'Entrar'}</button>
      <p className="login-help">Acesso exclusivo a usuários autorizados.<br />Precisa de acesso? Procure o administrador.</p>
    </form><footer>Gestão de Projetos &amp; Demandas</footer></section>
  </main>
}
