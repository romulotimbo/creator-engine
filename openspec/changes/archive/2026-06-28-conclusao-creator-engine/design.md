## Context

O Creator Engine é uma app Next.js 16 (App Router) + Prisma 6 + PostgreSQL (`schema=creator_engine`), com NextAuth v5 (JWT). A spec v2.0 define 15 módulos funcionais (PF-01–10, CE-01–05) e 5 blocos de requisitos não-funcionais. O código em `src/app/(dashboard)/` já cobre todas as rotas da sidebar; a maior parte do CRUD core está pronta. Os gaps restantes concentram-se em:

1. Módulos **read-only** que precisam de interatividade (funil, discovery, imagens)
2. Integrações **cross-módulo** (prompts↔posts, ferramentas↔financeiro, ferramentas↔FluxoImagem)
3. **Plano de ataque** — tabela legada em `public.creator_engine_state`, já copiada para `creator_engine` via SQL
4. **Exports e relatórios** — ausentes
5. **Segurança avançada** — TOTP, rate limiting

Restrições: tema dark via CSS variables (sem classes Tailwind de cor), Server Components por padrão, slug como identificador de persona, formatação pt-BR.

## Goals / Non-Goals

**Goals:**

- Fechar 100% dos requisitos funcionais da spec v2.0 marcados como PENDENTE ou "básico/estrutura"
- Entregar plano de ataque como página operacional dentro da app
- Manter compatibilidade com hermes-agent (não alterar `public.creator_engine_state` diretamente — ler/escrever na cópia `creator_engine`)
- Priorizar em 4 ondas: (A) operação diária, (B) integrações CE, (C) relatórios/exports, (D) segurança/RNF

**Non-Goals:**

- Redesign visual completo (tokens/paletas em andamento — fora deste change)
- Schema `rag` / pgvector / landing page RAG
- Integração MCP Postiz ou automação externa
- Backup automático diário em VPS (infra, não app)
- Suporte multi-usuário / RBAC (app é solo ops)
- Import completo do vault Obsidian na primeira iteração (apenas parser básico .md)

## Decisions

### D1 — Plano de ataque: introspect + model Prisma

**Decisão:** Rodar `\d creator_engine.creator_engine_state` no banco, modelar no `schema.prisma` com `@@map("creator_engine_state")`, página em `/plano-de-ataque` (fora do grupo dashboard ou dentro — preferir dashboard com auth guard).

**Alternativa rejeitada:** JSON estático em arquivo — perde sync com hermes-agent que grava no Postgres.

**Racional:** A cópia SQL já existe; hermes continua usando `public.*`; a app usa `creator_engine.*`.

### D2 — Funil/Discovery/Imagens: padrão modal + API REST existente

**Decisão:** Seguir o padrão já usado em roteiros, financeiro e ferramentas — Server Component page + Client modal + rotas `/api/funil`, `/api/discovery`, `/api/imagens` (ou nested em persona).

**Alternativa rejeitada:** Server Actions — o projeto já padronizou em API routes + `router.refresh()`.

### D3 — Import prompts: job idempotente one-shot + botão manual

**Decisão:** Endpoint `POST /api/prompts/import` que deduplica por hash do texto do prompt, cria `PromptGlobal` a partir de `Post.promptIa` não vazios, associa `PromptExemplo` com persona de origem.

**Racional:** 521 posts existentes; import único com opção de re-run seguro (skip duplicatas).

### D4 — "Usar em post": fluxo inverso do "Usar template"

**Decisão:** Modal em `/prompts` seleciona persona + post PENDENTE ou cria rascunho; preenche `promptIa` via PUT `/api/posts/[id]`.

### D5 — Heatmap analytics: agregação server-side

**Decisão:** Query `Post` com `status=PUBLICADO`, agrupar por `EXTRACT(DOW FROM dataPublicacao)` × hora; render com grid CSS (sem lib extra). Dados insuficientes → estado vazio.

**Alternativa rejeitada:** Recharts heatmap — não há componente nativo; grid custom é mais leve.

### D6 — Export XLSX roteiros: reutilizar ExcelJS

**Decisão:** `GET /api/posts/export?personaId=&status=` gera arquivo com mesmas colunas do import (A–R).

### D7 — MFA/TOTP: fase D separada

**Decisão:** Adicionar `totpSecret` (encrypted) e `totpEnabled` no `User`; setup via QR na página de perfil; reveal de credenciais exige TOTP quando habilitado.

**Alternativa:** WebAuthn — mais complexo, fora do escopo imediato.

### D8 — Rate limiting: middleware leve em memória

**Decisão:** Middleware Next.js com Map in-memory (suficiente para solo ops/VPS single instance). Limite: 100 req/min por IP nas rotas `/api/*`.

**Alternativa rejeitada:** Redis — overkill para deploy atual.

### D9 — RN-01 duplicidade: validação no POST/PUT persona

**Decisão:** Query `Persona` onde `dolphinProfileId` ou `proxyRef` já existem (excluindo self no PUT); retornar 409 com mensagem clara.

### D10 — Ordem de implementação (ondas)

| Onda | Escopo | Justificativa |
|------|--------|---------------|
| A | Plano de ataque, Funil, Discovery, Imagens, Status Log | Desbloqueia operação diária PF |
| B | Import prompts, Usar em post, Ferramenta↔FluxoImagem, P&L ferramentas | Integra módulos CE com PF |
| C | Heatmap, exports XLSX/PDF/JSON, export SOPs | Relatórios e portabilidade |
| D | RN-01 enforcement, TOTP, rate limiting | Segurança e compliance |

## Risks / Trade-offs

- **[Risco] Schema `creator_engine_state` desconhecido** → Mitigação: introspect antes de modelar; não rodar `db push --accept-data-loss`
- **[Risco] Sync plano de ataque public vs creator_engine** → Mitigação: documentar que hermes usa `public`; app usa cópia; sync manual ou trigger futuro
- **[Risco] TOTP bloqueia reveal se perder seed** → Mitigação: backup codes na ativação; desativação exige senha mestra
- **[Risco] Rate limit in-memory não persiste entre restarts** → Aceitável para solo ops; documentar limitação
- **[Trade-off] Import Obsidian simplificado** → Parser frontmatter YAML + body; mapeamento manual de tipos; vault completo fica para iteração futura
- **[Trade-off] PDF export via jspdf** → Layout básico; relatórios elaborados podem usar print CSS depois

## Migration Plan

1. Introspect `creator_engine_state` → adicionar model Prisma → `db push`
2. Implementar ondas A→D sequencialmente; cada onda testável independentemente
3. Deploy VPS: rodar `01-copy-plano-de-ataque.sql` se ainda não executado; `npm run build`
4. Rollback: features aditivas — reverter commits por onda; schema additions são backward-compatible

## Open Questions

1. Estrutura exata de `creator_engine_state` (colunas JSON vs relacional) — resolver na introspect
2. Plano de ataque deve ser editável pela app ou read-only (hermes como source of truth)?
3. Heatmap: usar `dataPublicacao` ou `dataStatus` para posts PUBLICADOS?
4. Custo de ferramentas no P&L: rateio proporcional por persona ativa ou 100% global?
