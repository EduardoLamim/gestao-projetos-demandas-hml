# Gestão de Projetos & Demandas
## Especificação funcional e técnica para implementação com Codex

**Versão:** 1.1 — 10/11/2026  
**Situação:** Etapa 0 aprovada; Etapa 1 — Fundação HML autorizada  
**Público inicial:** equipe de Suporte/Infraestrutura de um terminal portuário  
**Nome do produto:** Gestão de Projetos & Demandas (provisório)  
**Regra visual mandatória:** a identidade visual pode usar paleta corporativa de referência, **mas nunca exibir a palavra “JBS”, logotipo da empresa ou marca corporativa em interface, nome do produto, título, menu, e-mail, PDF ou rodapé**. O nome da empresa mencionado apenas nesta especificação contextual não deve ser propagado aos artefatos públicos do software.

> **Instrução principal ao Codex:** leia todo este documento antes de propor alterações. Inicie pela auditoria do repositório, plano de execução e definição dos contratos/migrações. Não implemente todas as fases de uma só vez e não invente regras onde o documento marcar validação pendente. O objetivo é um MVP de uso cotidiano, não uma demonstração visual. Não antecipar trabalho de PRD antes de aprovar HML.

---

# 1. Objetivo e princípios

Criar aplicação web responsiva para centralizar **projetos, demandas, chamados ServiceDesk, Kanban, Daily e acompanhamento gerencial**, com histórico confiável e relatórios Weekly em PDF.

Princípios: 
1. **Entrada mínima de dados:** informação criada uma vez deve reaparecer nas demais telas; reduzir retrabalho e obrigatoriedade de atualização manual.
2. **Fonte única da verdade:** Kanban, projeto, demanda, Daily, dashboard e relatório leem as mesmas entidades; não criar clones de tarefas.
3. **Acompanhamento, não vigilância:** distribuição por responsável serve para avaliar carga, não produtividade individual; horários de expediente não são ponto eletrônico.
4. **Dados externos são distintos dos internos:** status do ServiceDesk não substitui status operacional; prazo SLA não significa resolução efetiva.
5. **MVP utilizável cedo:** priorizar HML navegável e funcional, com entregas pequenas, verificadas, testadas e homologadas.
6. **Portabilidade realista:** desenvolver hoje com GitHub Pages + Supabase; preparar evolução para aplicação hospedada em VM Linux + PostgreSQL próprio, compreendendo também autenticação, API, autorização, deploy, arquivos e processos de fundo.
7. **Design de produto próprio:** UX profissional, clara e sóbria; evitar estética genérica de IA (gradientes vistosos, excesso de cards, gráficos decorativos, ícones sem função ou vazios inventados).

# 2. Escopo, navegação e nomes oficiais

**Cinco áreas primárias**, sem criar uma sexta tela de “alertas” ou “relatórios” no menu principal:

1. **Visão Gerencial:** indicadores, projetos, distribuição de demanda, pontos de atenção (subvisão interna), resumo 30s, Weekly e exportação PDF.
2. **Projetos:** listagem, criação, edição, detalhe, demandas vinculadas, progresso, situação, Gantt dentro do projeto, impedimentos e encerramento.
3. **Demandas:** demandas independentes e seção **ServiceDesk** para chamados importados, associações e acompanhamento.
4. **Kanban:** quadro operacional único **somente de demandas**; não há modo “Projetos”.
5. **Daily:** reuniões, modo reunião/modo registro, compromissos, decisões, pontos de atenção e histórico.

Administração (usuários, configurações, importações e parametrizações) pode ficar em menu secundário de configuração; não conta como sexta área operacional.

**Terminologia obrigatória:**
- **Projeto:** iniciativa que agrupa demandas.
- **Demanda:** unidade executável; pode ser independente ou vinculada a projeto. **Não usar “atividade” como entidade nem como rótulo alternativo na interface.**
- **Chamado:** registro externo importado do ServiceDesk. Não confundir chamado com demanda, mesmo quando vinculados.
- **Compromisso:** ação pactuada em Daily, não é demanda.
- **Decisão:** registro opcional de deliberação, não é compromisso.
- **Impedimento:** condição manual e independente do status.
- **Ponto de atenção:** alerta operacional/gerencial, manual ou automático conforme origem.

# 3. Usuários e permissões

Perfis: **Administrador, Gestão, Operador**. Cadastro: nome, e-mail/login, perfil, dias e horário(s) de expediente, participa das Dailies (padrão sim), ativo/inativo. Suportar jornada parcial e diferentes horários sem inferir ausência fora do expediente. Não incluir **equipe**, **cargo** ou **função** no MVP. A aplicação atende inicialmente somente Suporte/Infraestrutura; separar equipes é evolução futura, não requisito atual.

Regras: 
- Operadores podem ler o trabalho da equipe conforme autorizações, atualizar demandas sob sua responsabilidade e registros para os quais tenham autorização, criar/resolver impedimentos pertinentes e atualizar compromissos que lhes sejam atribuídos; não alterar indiscriminadamente projetos de colegas.
- Gestão e Administrador criam/gerenciam projetos, configuram acompanhamento, conduzem/encerram Dailies e **confirmam formalmente o encerramento de projetos**.
- Administração cadastra/desativa usuários, define perfis, administra importações e parâmetros.
- Autorização deve ser aplicada **no servidor/banco**, nunca apenas em botões ocultos; exigir testes de acesso cruzado, criação indevida, alteração de responsável e escalonamento de privilégios.
- Perfis e horários são configurações independentes. A desativação deve impedir novas sessões/ações conforme mecanismo de autenticação adotado; documentar comportamento de sessões já emitidas e estratégia de revogação.

**Definições de política a homologar antes de liberar produção:** criação de demandas por operador, delegação de responsabilidades entre operadores e regras específicas de edição dos compromissos de terceiros. Adotar padrão restritivo até homologação.

**Decisão aprovada na Etapa 1:** login tradicional por e-mail e senha via Supabase Auth, sem OTP/magic link e sem SMTP nesta etapa. Não permitir autocadastro público; somente Administrador cadastra usuários por operação protegida no backend. Implementar logout, sessão e bloqueio de inativos. Recuperação por e-mail fica para evolução após configurar envio. Primeiro Administrador provisionado por procedimento seguro com credenciais fornecidas fora do código/Git/migrations, após confirmação do e-mail pelo solicitante.

# 4. Domínio e regras de negócio

## 4.1 Campos comuns

IDs internos UUID, criado_em/por, atualizado_em/por, histórico de eventos e exclusão lógica quando aplicável. Usar timestamps UTC no banco e apresentar America/Sao_Paulo na interface. Prazos sem horário devem representar datas de calendário local, evitando falso atraso por conversão de fuso.

Prioridades internas: **Baixa, Média, Alta, Crítica**. Status operacionais de demandas: **Não iniciado, Em andamento, Em validação, Concluído, Cancelado**. “Em validação” é opcional no fluxo: demanda pode ir de Em andamento diretamente para Concluído. Impedimentos não viram status nem nova coluna do Kanban.

## 4.2 Projetos

Campos: nome (obrigatório), descrição/objetivo breve (obrigatório), responsável principal (obrigatório), prioridade (obrigatório), datas planejadas de início/fim opcionais, observações opcionais, vínculos com zero ou mais chamados, demandas vinculadas, auditoria. Pode existir projeto sem demandas.

**Progresso:** `concluídas / (total - canceladas) * 100`; se não houver demandas não canceladas, mostrar “— / sem demandas válidas”, **não 100%**. Demandas canceladas são excluídas. Evitar porcentagem indevida para projeto sem escopo.

**Status de execução:** Não iniciado, Em andamento, Em validação, Concluído, Cancelado; derivado das demandas durante execução, mas conclusão/cancelamento são ações gerenciais explícitas.
- Sem demandas ou sem progresso: Não iniciado.
- Havendo demanda executada/concluída e outras ainda pendentes: Em andamento, exceto quando todas as pendentes estão em validação (→ Em validação).
- Todas as demandas não canceladas concluídas, existindo pelo menos uma: **Pronto para conclusão** como *condição de elegibilidade*, não um sexto status; permanece pendente de confirmação pela Gestão/Admin. A interface deve exibir claramente esta condição.
- **Concluído:** somente após confirmação autorizada, com data, responsável e evento de auditoria. Demandas não são alteradas nessa ação.
- **Cancelado:** ação autorizada com motivo, confirmação e política explícita para as demandas abertas; nunca cancelá-las silenciosamente.
- **Reabrir:** ação autorizada e auditada; liberar alterações somente conforme estado e regras.
- Projetos concluídos não permitem adicionar/alterar demandas sem reabertura.

**Situação gerencial** (apenas enquanto em execução; mostrar status real quando não iniciado/encerrado):
1. **Em andamento:** sem condições relevantes de atenção. É *saúde gerencial* e pode coexistir com status de execução Em andamento; rotular os campos distintamente.
2. **Em atenção:** atrasos, estagnação ou risco registrado, sem impedimento manual ativo que se sobreponha.
3. **Com impedimentos:** pelo menos um impedimento manual ativo do próprio projeto ou de demanda não concluída, com outras frentes capazes de avançar.
4. **Execução impedida:** impedimento geral explicitamente marcado como impeditivo da continuidade inteira **ou** todas as demandas ainda executáveis estão com impedimentos ativos. Não deduzir paralisação total de um único bloqueio parcial.

Prioridade de exibição: Execução impedida > Com impedimentos > Em atenção > Em andamento. Preservar todos os motivos detalhados mesmo que um estado prevaleça. **Somente impedimentos internos manuais** participam da classificação de impedimento; status ServiceDesk “Aguardando Fornecedor” não cria impedimento.

Ambiguidade técnica a resolver com testes: projeto com nenhuma demanda pendente porque todas canceladas; projeto com todas concluídas mas sem confirmação; impedimento no projeto que não paralisa todas as frentes. Não marcar automaticamente Concluído.

## 4.3 Demandas

Entidade única: título (obrigatório), responsável principal (obrigatório), `project_id` opcional, descrição opcional, categoria configurável, prioridade (obrigatória ou herdada do projeto com override), status obrigatório, apoiadores opcionais, datas opcionais, observações, impedimentos e vínculo opcional com chamados. Demandas **não têm subtarefas**.

Uma demanda independente pode ser convertida em projeto **sem duplicar trabalho ou perder histórico**: operação transacional auditada, registrar origem e relação entre objetos, definir como distribuir trabalho remanescente, impedir referências cíclicas e dupla contagem. Apresentar prévia de conversão para confirmação. Um chamado também pode originar projeto: preservar chamado externo, criar projeto com identificação do número do chamado no título inicial (editável) e criar vínculo.

## 4.4 Impedimentos

Criados **manualmente** em projeto, demanda ou chamado, com motivo estruturado (fornecedor, gestão, outra área, técnico, outro), explicação, próxima ação, quem deve agir, criação, resolução e trilha histórica. Impedimento independente do status e do progresso. Impedimento em demanda reflete no projeto sem criar cópias; em chamado externo só afeta diretamente projetos/demandas associados quando existir vínculo e regra explícita de impacto, sem presumir bloqueio total.

## 4.5 Chamados ServiceDesk

Entidade externa com fonte/origem e `ticket_number` exclusivos. Importações sucessivas fazem **upsert por origem + número** e preservam as anotações gerenciais, sinalizadores de acompanhamento, vínculos, compromissos e impedimentos. **Ausência em exportação não significa encerramento**. Guardar data/hora da última importação e do último avistamento por chamado. Sem link externo “abrir chamado” no ServiceDesk. Link interno para detalhes é permitido.

Importação com prévia, validação por coluna, deduplicação, relatório de erros por linha, processamento atômico ou por lotes idempotentes com resultado explícito; registrar autor, data, hash opcional, contagem de incluídos/alterados/inalterados/erros; não substituir valores manualmente anotados por exportações posteriores.

Título detalhado não existe no CSV inicial: usar fallback legível `Chamado #N — Processo` e permitir título gerencial adicional opcional que não sobrescreva a origem.

**Acompanhamento na Daily:** flag manual “Acompanhar na Daily”, sem prazo de expiração definido; alertas automáticos de atraso, estagnação, impedimento manual e compromisso pendente podem sugerir registro conforme regras da pauta, sem modificar flag manual. Uma dispensa de alerta não deve se perder na próxima importação.

**Prioridade CSV:** armazenar como valor original e normalizado opcional, **não usar inicialmente** em ordenação, alertas ou indicadores; habilitação futura após atualização do ServiceDesk.

**SLA:** “Data de Resolução” é **prazo final calculado para atender o SLA**, jamais data real de conclusão. Comparar ao relógio e status de chamados com cautela, exibindo como alerta de SLA somente quando permitido pela regra de negócio validada; não afirmar conclusão real a partir desse campo.

## 4.6 Compromissos e decisões

- **Novos compromissos somente são criados dentro da Daily**, inclusive no modo registro / ao rever Daily. São itens próprios, **não criam demanda**.
- Campos: descrição obrigatória, responsável (padrão participante, editável), vencimento opcional, vínculo opcional a **somente um registro que integra a pauta daquela Daily** (projeto, demanda ou chamado), status Pendente / Resolvido / Cancelado, origem Daily, timestamps e auditoria. Vários compromissos por pessoa/reunião.
- Quando uma ação começa no contexto de um registro exibido na Daily, pré-selecionar o vínculo. Não oferecer busca global de todos os projetos/chamados nessa vinculação.
- Pendentes reaparecem automaticamente nas Dailies subsequentes até resolução/cancelamento; evitar duplicar registros a cada reunião. Registrar relação de exibição ao longo do tempo se necessário.
- **Resolver/cancelar/reabrir** compromisso existente também é possível ao consultá-lo fora da reunião, como histórico de Daily ou detalhe do objeto vinculado, conforme permissão; atualização imediata e refletida em todos os lugares. **Criação permanece exclusiva à Daily.**
- **Decisões:** criação opcional e discreta dentro da Daily; texto, vínculo opcional restrito à pauta, autor/data; ficam no histórico, sem carregar como pendência e sem status de resolução.

# 5. Daily

Uma Daily operacional da equipe, inicialmente sem separação por equipes. Gestão/Admin inicia, conduz e encerra. **Dois modos na mesma área:** Modo reunião (leitura clara, pauta/participantes/pontos) e Modo registro (edições rápidas). Auto-save das alterações autorizadas, retomada após interrupção; atualização de demanda/impedimento/compromisso é persistida imediatamente, sem depender do fechamento da reunião. Encerrar fixa o registro de reunião, não deve descartar atualizações anteriores.

Fluxo:
1. Abrir reunião, data/hora, participantes esperados sugeridos pelos horários/dias de expediente; permitir ajuste manual.
2. Sugerir pauta com demandas relevantes, projetos em atenção, chamados marcados para acompanhamento, pendências de compromissos anteriores e alertas não dispensados.
3. Registrar discussão/status, compromissos e decisões opcionais; registrar/resolver impedimentos sobre o objeto de origem.
4. Encerrar com registro histórico, decisões e itens pendentes.

Participação: Participou / Ausente / Não abordado para colaboradores esperados. Colaboradores fora do expediente não devem ser marcados automaticamente como ausentes. Sem ranking ou indicador de presença/produtividade.

**Seleção contextual obrigatória:** opções para vincular compromisso ou decisão = conjunto de registros efetivamente **presentes na pauta daquela Daily**, não o banco inteiro; vínculo continua válido mesmo se chamado mudar de status/encerrar depois.

# 6. Alertas e dispensas

Fontes: demanda/projeto atrasado, estagnação (parâmetro inicial **14 dias** sem alteração relevante observável), impedimento manual, compromisso vencido, necessidade de atuação gerencial e projeto pronto para conclusão. Datas e efeitos de importações devem ser claros.

- **Estagnação** deve usar histórico de mudança gerencial relevante, ou entre snapshots sucessivos do CSV, e **não** confundir `updated_at` técnico ou data de importação com progresso de trabalho. CSV não disponibiliza data real de última movimentação do chamado: até haver dois snapshots comparáveis, exibir “sem dados suficientes” para estagnação externa em vez de inventar duração.
- Atrasos internos usam prazo da demanda/projeto. SLA externo tem indicador distinto e identificado como SLA, nunca “demanda atrasada” automaticamente.
- Na Daily, alertas de um mesmo registro aparecem **agrupados em um cartão** com vários motivos.
- Permitir **dispensa persistente por motivo/episódio**, justificativa, autor/data; ocultar da pauta da Daily o mesmo episódio em reuniões seguintes, sem precisar dispensar diariamente. Novos motivos ou novos episódios podem aparecer. Permitir listar dispensados e reativar.
- Dispensa da Daily **não apaga** problema/impedimento, nem remove a transparência na Visão Gerencial (pode aparecer como justificado/dispensado).
- Status externo “Aguardando fornecedor” **não gera automaticamente impedimento**.

# 7. Kanban

**Um único modo: Demandas.** Não desenvolver alternância Projetos/Demandas. Colunas: Não iniciado, Em andamento, Em validação, Concluído, Cancelado. O impedimento aparece como indicador transversal no cartão, jamais coluna/status próprio.

Cada cartão: título, **identificação visual clara do projeto de origem** (ou “Independente”), responsável, prioridade, prazo, sinalização de impedimento. Filtros: projeto (inclusive “Demandas independentes”), responsável, prioridade, situação de impedimento; busca textual recomendada. Selecionar “Modernização CFTV” mostra exclusivamente as demandas desse projeto em suas respectivas colunas. Poder ocultar concluídas/canceladas. Alterar status no Kanban atualiza a entidade original com RLS e auditoria; preferir interação fluida (drag-and-drop com alternativa acessível) e feedback claro. Nenhum cartão de projeto no quadro.

# 8. Visão Gerencial, indicadores e relatórios

## 8.1 Dashboard

**Indicadores principais de situação atual** (não mudam ao selecionar período histórico):
- Projetos ativos = não concluídos e não cancelados (identificar separadamente não iniciados quando apropriado).
- Demandas pendentes = não concluídas e não canceladas.
- Demandas com impedimentos = demandas com impedimento manual ativo (contagem por demanda, sem duplicar várias ocorrências).
- Prazos vencidos = demandas pendentes com data limite no passado, considerando calendário local.

Cada KPI clicável leva à visão filtrada. Projetos: tabela compacta com progresso, status execução, situação gerencial, responsável, prazo e atenção. Distribuição por colaborador: contagem de demandas abertas por **responsável principal**, não somar apoiadores, não rotular como ranking de produtividade. Visualização de pontos de atenção dentro da área da Visão Gerencial, não item primário separado.

**Históricos por período** (somente estes respeitam seletor de datas): demandas efetivamente concluídas no intervalo, marcos e mudanças auditadas, compromissos resolvidos/cancelados no intervalo, decisões, importações e evolução de projetos quando houver histórico suficiente. Nunca recompor “estado naquela data” somente a partir da situação atual. Para informação insuficiente, indicar limitação explicitamente.

Chamados ServiceDesk têm métricas próprias e data/hora de atualização visível; não somar quantidade de tickets importados aos KPIs de demandas internas.

## 8.2 Resumo 30 segundos

Botão próximo à exportação PDF, produz narrativa objetiva e **determinística** no MVP baseada no banco e filtros. Texto curto com avanços, impedimentos, atrasos e necessidade de gestão; não inventar avaliações. Preparar contrato de `SummaryProvider` para eventual integração futura com API OpenAI **somente mediante aprovação**, chave guardada no backend, com minimização de dados corporativos. **Não integrar LLM agora e não adotar modelo local/open-source.**

## 8.3 Weekly e PDF

Configuração: semana atual, semana anterior ou período personalizado; incluir/excluir seções opcionais. Prévia antes do PDF. Seções: resumo executivo, projetos e percentuais, entregas/demandas concluídas no período, pendências, pontos de atenção/impedimentos, panorama ServiceDesk com frescor da importação, compromissos/decisões relevantes. Layout de relatório próprio, profissional e sem logotipo ou menção à marca corporativa. Inclusão de dados deve respeitar autorizações, período e fonte. Testar que UTC/data local não altera inclusão em semana.

# 9. Mapeamento validado da exportação ServiceDesk

**Arquivo de referência entregue pelo solicitante:** `exportacao_2.xlsx`. Inspeção estrutural: **147 linhas incluindo cabeçalho = 146 registros, 12 colunas**. Não presumir que o arquivo estará disponível no repositório Codex: solicitar cópia local quando for implementar/importar. Não armazenar arquivo bruto com nomes pessoais em repositório público; gerar fixture fictícia/sanitizada para testes.

| Coluna Excel | Campo sugerido | Regra |
|---|---|---|
| Chamado | `ticket_number` | Identificador externo, texto; chave com origem |
| Formulário | `form_code` | Preservar como texto (zeros à esquerda) |
| Tempo de Resolução | `resolution_sla_duration_raw` | Preservar valor bruto; validar unidade antes de cálculos; vírgula decimal |
| Tempo de Resposta | `response_sla_duration_raw` | Idem |
| Nome | `requester_name` | Solicitante; dado pessoal, acesso controlado |
| Data Abertura | `opened_at` | `dd/MM/yyyy HH:mm` interpretado no fuso aplicável |
| Data de Resolução | `sla_deadline_at` | **Prazo limite SLA calculado; NÃO data de resolução efetiva** |
| Analista | `analyst_name` | Campo textual de origem; não equiparar automaticamente a usuário interno |
| Processo | `process_name` | Classificação externa, fallback de título |
| Status | `external_status` | Preservar valor original, sem conversão para status interno |
| Tipo chamado | `ticket_type` | Solicitação / Problema / outros valores reais |
| Prioridade | `external_priority_raw` | Importar e preservar; **uso operacional desativado por enquanto** |

Validações: número do chamado sem perda de precisão; normalização acentuada e espaços somente para comparações, preservar original; datas não ambíguas; valores ausentes; idempotência de reimportação; atualizações pontuais; não encerrar chamados ausentes. Não inferir “última atualização no ServiceDesk” a partir da última importação. `Nome` e `Analista` podem conter dados de pessoas; aplicar política de acesso e retenção.

# 10. Arquitetura atual e caminho para VM Linux + PostgreSQL

## 10.1 Objetivo arquitetural

**Operação inicial:** frontend SPA no GitHub Pages + dados/Auth/RLS no Supabase, ambientes HML e PRD isolados. **Possível destino futuro:** frontend/API hospedados em **VM Linux**, dados em **PostgreSQL próprio** (na mesma VM ou instância gerenciada pela infraestrutura). Migrar **não é apenas trocar string de conexão**: Supabase hoje entrega Auth, APIs, RLS, storage e funções. Desenhar explicitamente como substituir essas responsabilidades.

## 10.2 Stack de referência

- Frontend: **React + TypeScript + Vite + Tailwind CSS**, componentes acessíveis, design tokens, rotas tipadas e forms validados.
- Dados atuais: PostgreSQL Supabase com migrações SQL versionadas, índices, constraints, FKs, RLS, transações para operações críticas e auditoria.
- Autenticação atual: Supabase Auth, com perfis próprios no banco e autorização RLS; serviço de autenticação encapsulado por `AuthPort`.
- Cliente de dados: interfaces por domínio (`ProjectsRepository`, `DemandsRepository`, `TicketsRepository`, `DailyRepository`, `ReportsRepository`) e `SupabaseAdapter`; **não espalhar chamadas `supabase.from(...)` por componentes React**.
- Operações privilegiadas, importação, exportação robusta e possíveis integrações: funções server-side protegidas (ex.: Supabase Edge Functions) **com regras de negócio isoladas em módulos TS puros**, autenticação e autorização explícitas; não expor service role no browser.
- Futuro backend: **API Node.js + TypeScript** (por exemplo Fastify, a validar) executada em container na VM, conectando via driver PostgreSQL/SQL e aplicando autorização; adaptar os ports sem reescrever UI/regras; avaliar se algumas funções SQL ficam no banco.
- PDF: estratégia compatível com os dois destinos; se for geração cliente, avaliar limites e segurança; preferir camada server-side nas operações que demandam dados sensíveis e controle consistente de acesso.
- Dependência de Supabase Realtime/Storage: **não adotar por padrão se não forem indispensáveis**; se usados, abstrair interfaces e documentar equivalentes futuros.

### Fluxos de referência

**Agora:** Navegador → GitHub Pages (SPA) → Supabase Auth + camada de acesso → Postgres/RLS; ações privilegiadas via funções de backend do Supabase.

**Depois, se aprovado:** Navegador → frontend servido por Nginx na VM → API TS com auth/autorização → PostgreSQL próprio; proxy HTTPS, migrações, backups, monitoramento e logs.

**Segurança crítica:** no desenho atual, RLS protege operações diretas ao Supabase. Na migração a PostgreSQL simples, não presumir que RLS continuará automaticamente respeitando identidade do usuário: a API deve verificar identidades e políticas, e/ou estabelecer corretamente contexto seguro de sessão e RLS. Documentar escolha e testar isolamento.

## 10.3 Portabilidade e limites reais

- Usar **PostgreSQL padrão** tanto quanto possível, funções SQL portáveis, versionar todas as migrações; evitar extensões exclusivas que não possam ser provisionadas na VM.
- Tabelas de domínio independentes do esquema interno de Supabase Auth sempre que possível: guardar `auth_subject`/UUID de referência, permitir migração de provedores e mapear identidades. Referências a `auth.users` precisam de estratégia de migração.
- Evitar lógica central em Edge Functions altamente acopladas a Deno; manter serviços de domínio transportáveis a runtime Node onde viável.
- Configuração por ambiente (URLs e chaves públicas do cliente; segredos somente backend), sem hardcoding.
- Manter plano de **migração de dados, contas, hashes de senha e sessões**; a portabilidade de autenticação exige decisão própria, não prometer transferência transparente de credenciais/sessões.
- Migrar arquivos/Storage e jobs se existirem; prever reconfiguração de e-mail, DNS, TLS, backup, restore e monitoramento.
- A migração futura é **capacidade arquitetural**, não entregável de infraestrutura completa no MVP. Documentar desenho de destino e checklist, sem instalar VM agora.

### Opção alternativa de migração (a comparar quando chegar a hora)

**Supabase self-hosted via Docker** em VM Linux preserva parte do ecossistema de Auth/API/Storage e pode reduzir retrabalho, mas tem complexidade operacional e diferenças em relação à plataforma gerenciada. **Não decidir agora** entre (A) PostgreSQL + API própria e (B) Supabase self-hosted. A arquitetura deve manter as duas opções viáveis enquanto o custo incremental for razoável. Fonte oficial de referência: https://supabase.com/docs/guides/self-hosting e https://supabase.com/docs/guides/self-hosting/restore-from-platform .

## 10.4 HML, PRD e repositórios

- Dois repositórios GitHub independentes, com a mesma linhagem Git e código funcional: HML para desenvolvimento/homologação; PRD somente para versões aprovadas. Cada repositório possui GitHub Pages e projeto Supabase próprios. Não criar cópias HML/PRD dentro do mesmo repositório.
- HML autorizado: `https://github.com/EduardoLamim/gestao-projetos-demandas-hml`, Supabase `bzuuckljgtaqtdrlpamf`, URL `https://bzuuckljgtaqtdrlpamf.supabase.co`. PRD não deve ser configurado na Etapa 1.
- Código, documentação, migrations, testes e workflows são versionados. Não commitar `.env`, dumps reais ou credenciais. Segredos, URLs, callbacks e usuários de cada ambiente são independentes.
- Promover o commit/tag homologado preservando os commits originais, preferencialmente por fast-forward. Não copiar arquivos, fazer squash/cherry-pick rotineiro ou force-push. PRD não recebe alterações funcionais próprias. Divergência bloqueia promoção e deve ser reconciliada em HML.
- Aplicar somente migrations pendentes, sem editar migrations já aplicadas. Verificar destino, backup/restore e compatibilidade antes da promoção; rollback de frontend não reverte banco. Nunca copiar dados/usuários HML automaticamente para PRD.
- A separação dos repositórios não resolve por si a adequação de GitHub Pages a autenticação/transações sensíveis. Avaliar hospedagem, autenticação, privilégios e RLS antes de disponibilizar acesso.
- Deploy de produção somente após homologação HML e autorização explícita.
- GitHub Pages SPA: configurar `base` do Vite, URLs de callback de autenticação, e fallback de rotas (hash router ou solução confiável) para evitar 404 após refresh.
- Database migration aplicada de forma rastreável e testada antes do frontend correspondente; rollback/backup conforme criticidade.
- Tratar limites/plano gratuito do Supabase com estratégia de keep-alive leve apenas se necessária e permitida, sem carga artificial.

# 11. Modelo lógico mínimo (a materializar pelo Codex)

Entidades/tabelas sugeridas, com nomes sujeitos à revisão arquitetural, mas relações obrigatórias:

| Entidade | Finalidade central |
|---|---|
| `profiles` | usuários, perfil, expediente, status e identidade auth |
| `projects` | projetos, datas, responsável, metadados e estado formal |
| `demands` | tarefas executáveis, `project_id` nullable, status, prioridades, datas |
| `demand_supporters` | apoiadores N:N |
| `tickets` | dados atuais importados do ServiceDesk, origem + número único |
| `ticket_import_batches` | importação, hash, data, totais e resultado |
| `ticket_import_changes` | alterações detectadas por importação, para auditoria/estagnação externa quando possível |
| `record_ticket_links` | vínculo projetos/demandas ↔ chamados, sem duplicação |
| `blockers` | impedimento polimórfico manual com ciclo de vida e alcance (parcial/geral quando projeto) |
| `daily_meetings` | cabeçalho da reunião, modos e encerramento |
| `daily_participants` | participantes e situação considerando expediente |
| `daily_agenda_items` | quais projetos/demandas/chamados estavam na pauta (base da seleção contextual) |
| `commitments` | compromissos criados na Daily, responsável, status, prazo e vínculo opcional |
| `daily_commitment_views` | reapresentações de compromissos em outras Dailies, se necessário |
| `daily_decisions` | decisões opcionais e vínculo opcional na pauta |
| `attention_events` | motivos/episódios de alertas quando persistência necessária |
| `attention_dismissals` | dispensa por alerta/motivo/episódio, justificativa e autor |
| `audit_events` | trilha estruturada de alterações relevantes |
| `app_settings` | parâmetros mínimos: estagnação, configurações e versão de regras |

Decisões de schema:
- Garantir uma **única origem de verdade** para atributos computados. Preferir consultas/views seguras ou serviços determinísticos a colunas duplicadas que possam divergir.
- Vínculos polimórficos devem possuir validação robusta de tipo/ID no backend e impedir referência órfã, mesmo quando uma FK tradicional não for possível. Avaliar tabelas específicas em vez de `entity_type/entity_id` livres quando isso melhorar integridade.
- Constraints e transações para não deixar projeto Concluído com demandas pendentes, salvo transição formal de reabertura devidamente auditada.
- Índices para responsável, status, projeto, datas, número do chamado, origem, última importação e alertas ativos.
- Histórico append-only ou protegido de mutações indevidas; alterações auditáveis de prioridade/status/prazo/responsável/impedimentos/compromissos/encerramentos.
- Campos de data criados e alterados pela aplicação não devem ser sobrescritos por CSV.

# 12. Critérios mínimos de aceite

1. HML funciona com login real, perfil, regras de leitura/escrita verificadas por testes de autorização.
2. Um projeto com 5 demandas, incluindo 1 cancelada e 2 concluídas, mostra 50% de progresso (2 / 4); sem demandas válidas não mostra 100%.
3. Uma demanda impedida continua “Em andamento” no Kanban com alerta visível; projeto com trabalho remanescente executável fica “Com impedimentos”; todas as frentes pendentes impedidas → “Execução impedida”.
4. Um projeto com todas as demandas concluídas fica **Pronto para conclusão**; apenas Gestão/Admin confirma e cria evento de encerramento. Um operador não pode concluir pela API.
5. Kanban mostra somente demandas, com projeto identificado em cada cartão; filtro por projeto limita corretamente todos os status; demandas independentes são filtráveis.
6. Daily mostra somente pessoas no expediente esperado; permite ajuste sem assinalar ausência automaticamente a quem está fora do horário.
7. Compromissos/decisões só oferecem vínculos da pauta; criação apenas na Daily; compromisso pendente carrega sem duplicação; resolução fora da reunião atualiza pauta e histórico.
8. ServiceDesk “Aguardando Fornecedor” não cria impedimento manual; dispensa do alerta de estagnação persiste na reimportação e em Dailies seguintes pelo mesmo episódio.
9. Importar duas vezes o mesmo Excel não duplica chamados; mudança de status externo não apaga nota/impedimento/vínculo interno; ausência de chamado em arquivo seguinte não encerra o registro.
10. “Data de Resolução” do Excel aparece identificada como **prazo SLA**, não data efetiva de resolução. Prioridade externa é armazenada, mas ignorada nos cálculos iniciais.
11. Dashboard atual não muda com seletor histórico; números históricos e Weekly consultam eventos com datas reais auditadas.
12. PDFs, cabeçalho, navbar, nome da aplicação, telas de login e metadados não contêm marca corporativa proibida.
13. Nenhum segredo de Supabase/serviço aparece no bundle JS ou repositório; ações privilegiadas não são feitas com `service_role` no cliente.
14. Repositório contém migrações SQL versionadas, exemplos de `.env` sem segredos, testes, plano de HML/PRD, arquitetura de adaptadores e **runbook de migração futura para VM Linux/PostgreSQL**.

# 13. Plano de execução por fases para Codex

**Etapa 0 — Auditoria e planejamento (primeira resposta do Codex):** inventariar diretório, repositório, stack instalada, ambientes e lacunas; retornar plano de implementações e decisões técnicas justificadas. Validar configuração **por projeto** de RTK (invocação explícita para comandos compatíveis), Graphify (grafo/MCP próprios), ai-memory (isolado por repositório) e Ponytail (hooks efetivos). Não assumir configuração apenas porque ferramenta está instalada em outro projeto. Não criar PRD prematuramente.

**Etapa 1 — Fundação HML:** scaffold React/TypeScript/Vite/Tailwind, design system, rotas, auth/perfis, Supabase HML, banco versionado, RLS/testes de segurança, pipelines GitHub HML, documentação e tela inicial funcional.

**Etapa 2 — Projetos e Demandas:** CRUD, status, responsáveis/apoiadores, vínculos, impedimentos, cálculo de progresso/saúde, conclusão formal, histórico; Gantt dentro de projeto após fluxo básico validado.

**Etapa 3 — Kanban:** visão única de demandas, filtro por projeto, cartões com origem visual, status, indicadores e persistência.

**Etapa 4 — Importador ServiceDesk:** XLSX/CSV, prévia e mapeamento, upsert idempotente, histórico de importação e vínculos com projetos/demandas; prioridade externa armazenada sem utilização.

**Etapa 5 — Daily:** pauta, modos reunião/registro, compromissos, decisões, participantes por expediente, alertas e dispensas persistentes.

**Etapa 6 — Visão Gerencial e Weekly:** KPIs, saúde, pontos de atenção, relatórios históricos, resumo determinístico, PDF com prévia.

**Etapa 7 — Refinamento e preparação de PRD:** testes E2E, acessibilidade, desempenho, auditoria, UX, segurança, restore/backup, documentação da portabilidade e checklist PRD; publicar PRD apenas após aprovação.

**A cada etapa:** Codex deve apresentar arquivos alterados, migrations, comandos executados, testes e evidências, restrições, riscos, instruções de validação manual e próximo incremento. Não declarar homologação aprovada sem execução de testes e confirmação do usuário.

# 14. Anti-escopo e restrições finais

**Não implementar:**
- nomes/logos corporativos;
- gestão multi-equipe e cargo/função no cadastro;
- modo Kanban de projetos;
- coluna Kanban “Bloqueado”;
- conversão automática de status de ticket em impedimento;
- link externo para abrir ServiceDesk;
- modelo local de IA nem integração OpenAI no MVP;
- busca global na vinculação de compromisso/decisão;
- criação de compromisso fora da Daily;
- controle de ponto/assiduidade/produtividade;
- migração/implantação efetiva da VM agora;
- módulos e campos extras sem ganho funcional comprovado.

**Diretriz final para o Codex:** qualidade e aderência às regras acima têm prioridade sobre volume de código. Quando um detalhe não estiver explícito, propor o menor comportamento reversível e seguro, sinalizar a decisão, não inventar uma política operacional. O resultado deve parecer um sistema corporativo que as pessoas queiram usar todos os dias, sem cobrança constante para alimentá-lo.
