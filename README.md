# Gestão de Projetos & Demandas

Fundação HML: login e senha, sessão, perfis, expediente e administração de usuários. Os módulos operacionais ainda não foram implementados.

## Desenvolvimento

Node.js 24 e npm. Execute `npm ci`, copie `.env.example` para `.env.local`, preencha exclusivamente a chave **publishable** HML e execute `npm run dev`.

- `npm run check`: lint, tipos, build e testes de domínio/segurança.
- `npm run test:e2e`: Chromium desktop e mobile; instalar antes com `npm exec -- playwright install chromium`.
- `npm audit --audit-level=moderate`: auditoria de dependências.
- `npm exec -- supabase --version`: CLI local fixada no lockfile; não usar o wrapper global.

PGlite executa PostgreSQL real em WebAssembly para verificar grants, RLS e transações sem Docker. O schema `auth` dos testes é um substituto mínimo; a suíte remota complementa essa verificação. E2E usa respostas simuladas e não prova login no Supabase real.

## Referências

- [Especificação oficial](03.%20Documentação/ESPECIFICACAO_CODEX_GESTAO_PROJETOS_DEMANDAS.md)
- [Operação e homologação](03.%20Documentação/operacao-hml.md)
- [Arquitetura e portabilidade](03.%20Documentação/arquitetura-e-portabilidade.md)

HML: `EduardoLamim/gestao-projetos-demandas-hml`, Supabase `bzuuckljgtaqtdrlpamf`. Não há configuração PRD.
