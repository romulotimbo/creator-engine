## Context

`/calendario` (global) lista posts com status `AGENDADO` ou `APROVADO` em tabela read-only. O calendário por persona (`/personas/[slug]/calendario`) tem grid mensal com drag-drop de roteiros sem data. `Post` já tem `contaId` (plataforma) e `dataPublicacao`. `GET /api/posts` aceita `personaId`, `status`, `tipo` mas não filtra por `semData` ou `contaId`.

## Goals / Non-Goals

**Goals:**

- Agendar post a partir de `/calendario` com fluxo persona → conta → roteiro → data
- Vincular `contaId` ao post no agendamento
- Definir `dataPublicacao` e status `AGENDADO`
- Lista global atualiza após agendamento

**Non-Goals:**

- Substituir calendário mensal da persona por grid no global (MVP mantém tabela + modal)
- Criar roteiro novo neste fluxo (só selecionar existente)
- Publicar direto (status PUBLICADO) — apenas agendar
- Drag-drop no calendário global

## Decisions

### D1 — Modal wizard em 4 passos

**Decisão:** Select persona → select conta (filtrada por persona) → select post (roteiros elegíveis) → date + time → confirmar.

**Posts elegíveis:** `personaId` match, `dataPublicacao` null, status em `PENDENTE` ou `APROVADO`. Opcionalmente filtrar por `contaId` se post já tiver conta vinculada.

**Alternativa rejeitada:** Criar post inline no modal — escopo maior; usuário pediu selecionar roteiro existente.

### D2 — Extender GET /api/posts

**Decisão:** Adicionar query params `semData=true` e `contaId=`. Quando `semData=true`, filtrar `dataPublicacao: null`.

### D3 — PUT existente para persistir

**Decisão:** `PUT /api/posts/[id]` com `{ contaId, dataPublicacao, status: "AGENDADO" }`. Validar RN-04 no PUT (já pode existir).

### D4 — Server component + client modal

**Decisão:** `page.tsx` carrega personas ativas + posts agendados; `CalendarioGlobalClient` com tabela + modal.

### D5 — Personas BANIDA/SUSPENSA

**Decisão:** Excluir personas `BANIDA` do select (RN-04). `SUSPENSA` e `SHADOW_BAN` aparecem com aviso visual mas permitem agendar (consistente com calendário persona).

## Risks / Trade-offs

- **[Risco] Muitos roteiros sem data** → Mitigação: select com busca por título; limitar a persona selecionada
- **[Risco] Post sem conta pré-vinculada** → Mitigação: `contaId` obrigatório no agendamento; PUT seta conta
- **[Trade-off] Tabela vs grid global** → MVP mantém tabela; grid pode ser change futura

## Migration Plan

1. Estender `GET /api/posts` com filtros
2. Verificar RN-04 no `PUT /api/posts/[id]` para status AGENDADO
3. Implementar `CalendarioGlobalClient` + modal
4. Smoke test: agendar roteiro, verificar lista e calendário persona

Rollback: remover modal; filtros GET são aditivos.

## Open Questions

1. Incluir posts já `AGENDADO` para reagendar via mesmo modal? *(Default: sim, permitir alterar data/conta de posts agendados.)*
2. Horário default 12:00 (como calendário persona)? *(Default: sim.)*
