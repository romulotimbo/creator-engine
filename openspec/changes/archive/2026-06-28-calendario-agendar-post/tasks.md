## 1. API

- [x] 1.1 Estender `GET /api/posts` com filtros `semData=true` e `contaId`
- [x] 1.2 Garantir RN-04 no `PUT /api/posts/[id]` ao setar status `AGENDADO` (persona BANIDA)

## 2. Calendário global — client

- [x] 2.1 Criar `CalendarioGlobalClient.tsx` com tabela existente + botão "Agendar post"
- [x] 2.2 Refatorar `calendario/page.tsx` para server component carregar personas e posts
- [x] 2.3 Modal wizard: persona → conta → roteiro → data/hora
- [x] 2.4 Cascata: contas filtradas por persona; roteiros via `GET /api/posts?personaId&semData=true`
- [x] 2.5 Confirmar via `PUT /api/posts/[id]` com `contaId`, `dataPublicacao`, `status: AGENDADO`
- [x] 2.6 Estados vazios (sem contas, sem roteiros) e aviso SHADOW_BAN
- [x] 2.7 Excluir personas BANIDA do select

## 3. Verificação

- [x] 3.1 Smoke test: agendar roteiro sem data; verificar tabela global e calendário persona
- [x] 3.2 `npm run build` sem erros TypeScript
