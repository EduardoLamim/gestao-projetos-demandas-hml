import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import { readConfig } from './app/config'
import { createAccess } from './adapters/supabase/access'
import './styles.css'

let content: React.ReactNode
try {
  const config = readConfig(import.meta.env)
  content = <App access={createAccess(config.url, config.key)} />
} catch (error) {
  content = <main className="setup"><span className="eyebrow">Homologação</span><h1>Gestão de Projetos &amp; Demandas</h1><p role="alert">{error instanceof Error ? error.message : 'Configuração indisponível.'}</p></main>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{content}</React.StrictMode>)
