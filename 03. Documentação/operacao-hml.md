# Operação e homologação HML

## Destinos e credenciais

- GitHub: `EduardoLamim/gestao-projetos-demandas-hml`.
- Supabase: `bzuuckljgtaqtdrlpamf`, PostgreSQL 17.
- Aplicação publicada: [Pages HML](https://eduardolamim.github.io/gestao-projetos-demandas-hml/).
- CLI Supabase 3.1.0 local: `npm exec -- supabase`. Credenciais interativas ficam no mecanismo da CLI; nunca em Git.
- `.env.local` contém somente configuração pública e é ignorado. Não colocar segredo em variável `VITE_*`.

A CLI chama a branch principal de cada projeto de `production`; neste projeto isso continua sendo HML. Conferir sempre o project ref, não somente esse rótulo.

## Banco e backend

Antes de mudar o banco, consultar estado/histórico e executar os testes. Para migrations futuras, usar `npm exec -- supabase db push --remote=bzuuckljgtaqtdrlpamf --dry-run --skip-vault`; aplicar somente após revisar o resultado. Nunca resetar banco remoto. Migrations aplicadas são imutáveis.

`supabase/tests/hml-access.sql` exercita papéis reais em transação com rollback; executar somente em HML com `npm exec -- supabase db query --remote=bzuuckljgtaqtdrlpamf --file supabase/tests/hml-access.sql --yes`. Nenhuma fixture deve permanecer.

`npm exec -- supabase config diff --remote=bzuuckljgtaqtdrlpamf` compara configuração sem alterar. `config push` modifica somente propriedades declaradas; nunca enviar configurações sem revisar o diff. Data API deve expor somente `public`; `private` não pode ser exposto. Novos objetos exigem grants explícitos. Auth: autocadastro e login anônimo desabilitados, e-mail/senha habilitado, mínimo de 12 caracteres e JWT de 900 segundos.

Deploy da função: `npm exec -- supabase functions deploy create-user --remote=bzuuckljgtaqtdrlpamf --use-api --yes`. A verificação JWT do gateway está desativada para compatibilidade com as chaves atuais, mas o handler verifica o bearer token em `auth.getUser`, consulta perfil ativo/Administrador e a RPC revalida autorização. Sem esses controles não publicar a função.

## Primeiro Administrador

1. Confirmar nome/e-mail com o solicitante antes do provisionamento.
2. O solicitante cadastra a identidade no painel Auth do **HML**, com senha forte informada diretamente no formulário seguro; marcar e-mail confirmado, sem enviar convite.
3. Conferir o UUID dessa identidade. Um operador técnico autorizado provisiona o primeiro perfil via SQL privilegiado, em transação, verificando antes que não exista Administrador ativo. Nome/e-mail vêm da confirmação e da identidade Auth; não colocar senha no SQL ou migration.
4. Registrar o evento de bootstrap na auditoria. Remover qualquer arquivo temporário contendo dados pessoais.
5. Fazer login e testar cadastro administrativo pela aplicação. O frontend nunca recebe chave service_role.

No Windows, enviar blocos SQL multilinha por `--file`, em arquivo temporário ignorado pelo Git, e removê-lo ao terminar. A passagem de multilinha como argumento através do npm pode truncar o comando. Confirmar a persistência por consulta separada; saída sem erro não é evidência suficiente.

Esse bootstrap é procedimento inicial, não endpoint público. Usuários posteriores são cadastrados pelo Administrador na área secundária. Se cadastro Auth ocorrer e gravação do perfil falhar, a função tenta remover somente a identidade que acabou de criar; falha de compensação exige conferir identidade sem perfil antes de tentar novamente.

## CI e publicação

`ci.yml`: install pelo lockfile, lint, tipos/build, testes de domínio/RLS/provisionamento, auditoria de dependências e E2E desktop/mobile. A dependência transitiva minimatch está fixada em 11.0.7 por correção de vulnerabilidade; reavaliar o override quando as dependências diretas incorporarem a correção.

`deploy-hml.yml`: execução manual na main do repositório autorizado. Repete CI, exige Environment `hml`, chave pública em `SUPABASE_PUBLISHABLE_KEY` e liberação `HML_SECURITY_VERIFIED=true` após inspeção SQL/Auth e teste de login. O script `check-hml.mjs` bloqueia se tabelas não negarem acesso anônimo por privilégio. O build publica somente `dist/` em Pages via Actions; nenhum `.env`, fonte documental ou migration integra o site.

Migrations e função devem estar aplicadas antes da publicação correspondente. A pipeline não recebe senha de banco nem token administrativo; alterações backend são operações controladas pela CLI. Se futuras migrations mudarem a segurança, retirar a liberação até repetir a inspeção. A chave pública é publicável, não um segredo.

## Roteiro de homologação

1. Acessar a URL HML em desktop e celular, confirmar indicação HML e ausência de marca corporativa.
2. Login válido funciona; senha incorreta mostra erro genérico; não há autocadastro nem recuperação/OTP.
3. Atualizar a página preserva a sessão na aba; logout retorna ao login; acesso direto `#/usuarios` não revela dados sem autorização.
4. Administrador cadastra usuário fictício, configura perfil e dois períodos de expediente; edição reapresenta os valores.
5. Operador e Gestão não acessam administração; API/RPC rejeitam alteração indevida mesmo fora da interface.
6. Desativar usuário em outra sessão: próximas consultas deixam de retornar dados; frontend perde acesso ao atualizar/ganhar foco ou em até um minuto.
7. Testar edição concorrente e sobreposição de horários: falha explícita sem descartar dados persistidos.
8. Conferir auditoria e resultado dos testes. Não declarar aceite sem confirmação do solicitante.

## Ferramentas locais

RTK por invocação explícita. Graphify gerado com `graphify extract . --code-only --no-cluster --max-workers 2`, sem LLM; grafo ignorado no Git. Consultar somente o arquivo absoluto deste checkout. Após mudanças, regenerar; o grafo não substitui o código atual.

MCP Graphify configurado em `.codex/config.toml`, exclusivo do projeto. Pode exigir reabrir a sessão para aparecer na lista de ferramentas. ai-memory usa `.ai-memory.toml` ignorado no Git, preservando o namespace histórico `default / 08. Gestão de projetos e demandas`. PRD deverá ter seu próprio marcador, nunca copiar o de HML. Roteamento canônico foi adicionado ao `AGENTS.md`, sem duplicar hooks globais.

Ponytail full está ativo; a nova sessão confirmou `CLAUDE_PROJECT_DIR` apontando para este checkout. O hook real foi exercitado com estado temporário exclusivo do projeto, sem alterar flags globais. Graphify MCP respondeu ao handshake e à consulta do grafo local (229 nós/336 relações em 11/11/2026); isso não valida grafos de outros projetos.

## Evidências da fundação — 11/11/2026

- Autenticação GitHub CLI e Supabase CLI confirmada após intervenção do solicitante.
- Duas migrations aplicadas exclusivamente no HML; função `create-user` publicada com validação compartilhada de domínio.
- Suíte SQL remota passou para anônimo, Operador, Gestão, inativo, Administrador, escalonamento e proteção da auditoria, com rollback das fixtures.
- Execução direta de `public.rls_auto_enable()` negada a `anon` e `authenticated`, preservando o event trigger da plataforma.
- Validação local: 20 testes de domínio/segurança/publicação e 8 E2E simulados; lint, tipos e build aprovados. Auditoria npm sem vulnerabilidades no momento da verificação.
- CI Linux do commit `eed40a3` aprovado: [execução 43013689831](https://github.com/EduardoLamim/gestao-projetos-demandas-hml/actions/runs/43013689831). GitHub Pages usa publicação por Actions; Environment `hml` contém somente a chave pública e `HML_SECURITY_VERIFIED=false`.
- Primeiro Administrador vinculado à identidade confirmada por UUID real, em bloco privilegiado atômico com trava e recusa se já existir Administrador ativo; evento `profile.bootstrap` confirmado. Auth permaneceu com uma identidade, sem alteração de senha.
- Login por senha realizado pelo solicitante contra o Supabase real e confirmado por `last_sign_in_at`. Navegador autenticado manteve sessão após recarga e carregou o perfil real na administração; logout retornou ao login, inclusive após recarga direta de `#/usuarios`.
- REST real negou acesso anônimo às três tabelas (401/42501); `create-user` sem bearer retornou 401. Configuração remota sem divergências nas propriedades declaradas: Data API somente `public`, autocadastro desligado, site URL Pages HML e retorno local exato. Login por senha não usa callback OAuth/OTP; detecção de sessão na URL está desabilitada.
- Permissões de Operador/Gestão, inativos e tentativas de autopromoção foram verificadas no PostgreSQL remoto com papéis reais e rollback. Não equivalem a login por senha desses perfis no navegador; nenhuma segunda identidade foi criada e o único Administrador não foi desativado.
- Liberação `HML_SECURITY_VERIFIED=true` concedida após essas verificações; [publicação HML 43016441080](https://github.com/EduardoLamim/gestao-projetos-demandas-hml/actions/runs/43016441080) concluída com CI, build e deploy aprovados. HTTPS obrigatório; tela de login publicada conferida no navegador. Aceite humano continua pendente.
