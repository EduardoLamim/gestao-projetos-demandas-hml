# Arquitetura e portabilidade

## Fundação

React/TypeScript/Vite/Tailwind. `src/domain` define perfis, contratos e validação; `src/services` coordena acesso e provisionamento; `src/adapters/supabase` contém o SDK. Componentes dependem de serviços, não do SDK. A função `create-user` é um transporte Deno fino sobre o serviço TS de provisionamento.

Banco PostgreSQL 17, migrations versionadas. `profiles.id` é o UUID interno; `auth_subject` é o vínculo externo, sem FK com `auth.users`. `work_periods` suporta múltiplos períodos por dia e jornadas parciais. Não há tabelas dos módulos futuros.

Leitura: perfil/expediente próprios para usuários ativos; Administrador lê todos. Gestão não administra usuários. Escrita direta é negada inclusive ao Administrador; `save_profile` valida permissão, concorrência, identidade existente e expediente em uma transação. Auto-desativação e auto-rebaixamento do Administrador são proibidos. Criação Auth + perfil usa compensação da identidade recém-criada se SQL falhar; falha da compensação exige reconciliação administrativa. Nenhuma senha entra em auditoria.

Auditoria gerada por triggers e RPC, sem DML concedido ao cliente. Alterações de perfis são serializadas; conflitos de versão exigem recarregar. As verificações RLS usam `active` do banco, não papel informado pelo cliente ou metadados editáveis do JWT.

Login por senha, sem autocadastro, OTP, magic link ou SMTP na interface. Recuperação futura deverá adicionar operação ao `AuthPort`, backend/configuração de envio e fluxo dedicado com testes; não há botão sem funcionamento. Senhas novas têm mínimo de 12 caracteres, máximo de 72 bytes. Sessão guardada em `sessionStorage`, sem persistência após fechar a aba; logout local remove a sessão desta aba. JWT HML expira em 15 minutos, com renovação. Inativos podem ainda apresentar JWT válido, mas RLS/RPC negam suas ações imediatamente; a aplicação verifica o perfil ao entrar, ao ganhar foco e a cada minuto. A desativação não promete apagar tokens já emitidos nem sessões de outros dispositivos.

## Dois repositórios

HML e PRD possuem GitHub Pages e Supabase independentes, compartilhando a mesma linhagem Git e código funcional. Desenvolvimento somente HML. PRD será inicializado futuramente a partir do histórico aprovado, sem commit inicial concorrente.

Promoção: homologar commit/tag → autorização explícita → verificar ancestralidade e ausência de commits exclusivos PRD → transferir os commits originais por fast-forward → verificar backup/restauração → aplicar migrations pendentes → build com configuração PRD → verificações pós-deploy. Nunca force-push, cópia de arquivos ou edição de migration aplicada. Uma divergência bloqueia promoção e deve ser reconciliada em HML. Reverter frontend não reverte banco.

A Etapa 1 limita configuração de runtime, CSP e função ao HML autorizado. Antes de preparar PRD, externalizar os alvos por configuração validada, com a mesma implementação em ambos; nenhuma regra funcional pode variar por ambiente. Não há workflow PRD.

## Migração para Linux + PostgreSQL

1. Nginx serve o build estático; API Node/TypeScript substitui Data API e Edge Functions.
2. Implementar adaptadores HTTP mantendo contratos de domínio; portar `provisionUser` para Node.
3. Substituir `AuthPort`, mapear `auth_subject` para o provedor escolhido e preservar IDs internos. A consulta `auth.users` em `save_profile` e `auth.uid()` nas funções privadas são pontos explícitos de adaptação.
4. API valida JWT, conta ativa e autorização. Se preservar RLS, definir contexto confiável por transação, usar papel sem superusuário/BYPASSRLS e impedir vazamento de identidade no pool.
5. Ensaiar export/restore, constraints, índices, auditoria, versões de migrations e contagens; executar os testes negativos no destino.
6. Definir migração de contas/hashes, reautenticação e revogação de sessões. Não prometer portabilidade transparente de senhas.
7. Preparar TLS/DNS, e-mail, backups testados, logs sem credenciais e monitoramento. Definir janela de corte e retorno sem perder escritas.

Storage, Realtime e jobs não são dependências da fundação. Se adotados depois, documentar equivalentes. Supabase self-hosted permanece alternativa à API própria; não foi escolhido ou implantado.

## Segurança da hospedagem

Pages publica somente arquivos estáticos; credenciais privilegiadas existem apenas no backend. RLS é obrigatório mesmo com chave pública. CSP de build limita scripts/estilos à própria origem e conexões ao Supabase HML; não substitui autorização.

Dois repositórios do mesmo proprietário em `github.io` usam caminhos distintos, mas compartilham a origem do navegador. Isso não fornece isolamento de origem contra XSS em outro site do mesmo proprietário. A sessão usa chave própria, mas isso não é uma fronteira de segurança. Domínios próprios distintos ou outra hospedagem devem ser avaliados antes de dados reais/PRD.

A documentação do Pages desaconselha transações sensíveis, incluindo senhas. A escolha solicitada foi mantida para HML, sem presumir que o POST direto ao Supabase elimina essa questão. Exige avaliação de adequação antes de uso real; HML deve usar dados fictícios.

Fontes: [Pages — limites](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Supabase — segurança da API](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [self-hosting](https://supabase.com/docs/guides/self-hosting/restore-from-platform).
