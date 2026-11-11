import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { roleLabels, roles } from '../domain/auth'
import type { Profile, ProfileInput, Role } from '../domain/auth'
import type { AccessService } from '../services/access'

const empty: ProfileInput = { auth_subject: '', name: '', role: 'operador', active: true, participates_daily: true, periods: [], expected_updated_at: null }
const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export function Users({ access }: { access: AccessService }) {
  const [users, setUsers] = useState<Profile[]>([])
  const [draft, setDraft] = useState<ProfileInput | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  useEffect(() => { let cancelled = false; access.profiles.list().then(data => { if (!cancelled) setUsers(data) }).catch(() => { if (!cancelled) setError('Não foi possível carregar os usuários.') }); return () => { cancelled = true } }, [access])
  async function edit(user: Profile) {
    setBusy(true); setError(''); setNotice('')
    try { const periods = await access.profiles.periods(user.id); setDraft({ ...user, periods, expected_updated_at: user.updated_at }) } catch { setError('Não foi possível carregar o expediente.') } finally { setBusy(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (draft.expected_updated_at) await access.saveProfile(draft)
      else await access.createUser({ name: draft.name, role: draft.role, active: draft.active, participates_daily: draft.participates_daily, periods: draft.periods, email, password })
      setPassword(''); setEmail(''); setDraft(null); setUsers(await access.profiles.list()); setNotice('Usuário salvo. As permissões passam a valer imediatamente no banco.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') } finally { setBusy(false) }
  }
  return <><div className="page-heading"><span className="eyebrow">Administração</span><h1>Usuários e permissões</h1><p>Gerencie os acessos e o expediente da equipe.</p></div>
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="success">{notice}</p>}
    {!draft ? <><button className="primary" disabled={busy} onClick={() => { setDraft({ ...empty, periods: [] }); setEmail(''); setPassword(''); setError(''); setNotice('') }}>Cadastrar usuário</button><div className="table-scroll"><table><caption className="sr-only">Usuários cadastrados</caption><thead><tr><th>Nome / e-mail</th><th>Perfil</th><th>Acesso</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{roleLabels[user.role]}</td><td>{user.active ? 'Ativo' : 'Inativo'}</td><td><button className="text-button" disabled={busy} onClick={() => void edit(user)} aria-label={`Editar ${user.name}`}>Editar</button></td></tr>)}</tbody></table></div></> : <form className="user-form" onSubmit={save}>
      <h2>{draft.expected_updated_at ? 'Editar usuário' : 'Habilitar acesso'}</h2>
      {!draft.expected_updated_at && <><label htmlFor="new-email">E-mail</label><input id="new-email" type="email" autoComplete="off" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /><label htmlFor="new-password">Senha inicial</label><input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} /><p>Use pelo menos 12 caracteres. Entregue a senha ao usuário por um canal seguro. Recuperação por e-mail ainda não está disponível.</p></>}
      <label htmlFor="name">Nome</label><input id="name" required maxLength={120} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
      <label htmlFor="role">Perfil</label><select id="role" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as Role })}>{roles.map(role => <option value={role} key={role}>{roleLabels[role]}</option>)}</select>
      <label className="check"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} /> Acesso ativo</label>
      <label className="check"><input type="checkbox" checked={draft.participates_daily} onChange={e => setDraft({ ...draft, participates_daily: e.target.checked })} /> Participa das Dailies</label>
      <fieldset><legend>Expediente · horário de São Paulo</legend><p>Adicione os períodos de cada dia. Para jornadas com intervalo, use mais de um período.</p>
        {draft.periods.map((period, index) => <div className="period" key={index}><select aria-label={`Dia do período ${index + 1}`} value={period.weekday} onChange={e => setDraft({ ...draft, periods: draft.periods.map((p, i) => i === index ? { ...p, weekday: Number(e.target.value) } : p) })}>{days.map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select>{(['starts_at', 'ends_at'] as const).map(field => <input key={field} type="time" required aria-label={`${field === 'starts_at' ? 'Início' : 'Fim'} do período ${index + 1}`} value={period[field].slice(0, 5)} onChange={e => setDraft({ ...draft, periods: draft.periods.map((p, i) => i === index ? { ...p, [field]: e.target.value } : p) })} />)}<button type="button" aria-label={`Remover período ${index + 1}`} onClick={() => setDraft({ ...draft, periods: draft.periods.filter((_, i) => i !== index) })}>Remover</button></div>)}
        <button type="button" onClick={() => setDraft({ ...draft, periods: [...draft.periods, { weekday: 1, starts_at: '08:00', ends_at: '12:00' }] })}>Adicionar período</button>
      </fieldset><div className="actions"><button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar usuário'}</button><button type="button" disabled={busy} onClick={() => { setDraft(null); setPassword('') }}>Cancelar</button></div>
    </form>}</>
}
