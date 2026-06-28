## Context

`PlanoAtaqueItem` já existe no schema com campos `fase`, `titulo`, `descricao`, `concluido`, `ordem`. A página `/plano-de-ataque` renderiza itens agrupados por fase e permite toggle de `concluido` via `PATCH`. O seed `DEFAULT_ITENS` roda no primeiro `GET` quando a tabela está vazia.

Padrão do projeto: Server Component + Client modal + API routes + Zod + `router.refresh()`.

## Goals / Non-Goals

**Goals:**

- CRUD completo de itens sem alterar schema
- Separar ação de conclusão (checkbox) de edição/exclusão (botões)
- Permitir criar itens em fases existentes ou novas (texto livre)
- Reordenar via campo `ordem` numérico no modal de edição

**Non-Goals:**

- Drag-and-drop de reordenação (campo ordem manual é suficiente no MVP)
- Sincronização bidirecional com `public.creator_engine_state` / hermes-agent
- Histórico de alterações ou versionamento de itens
- Compartilhamento multi-usuário com permissões distintas

## Decisions

### D1 — Estender API existente em vez de nova rota

**Decisão:** `POST` em `/api/plano-de-ataque`; `PUT` e `DELETE` em `/api/plano-de-ataque/[id]`; `PATCH` mantém só `concluido`.

**Alternativa rejeitada:** `PUT` genérico no `[id]` para tudo — mistura toggle rápido com edição pesada; PATCH separado é mais claro.

### D2 — Modal único create/edit

**Decisão:** Um modal com campos fase (input + datalist de fases existentes), título, descrição, ordem.

**Racional:** Consistente com financeiro, ferramentas, métricas.

### D3 — Exclusão com confirmação

**Decisão:** Dialog de confirmação antes de `DELETE`; sem soft-delete.

### D4 — Barra de progresso recalculada no server

**Decisão:** `page.tsx` continua server component; após CRUD, `router.refresh()` recalcula progresso.

### D5 — Validação Zod

```typescript
createSchema = { fase: string.min(1), titulo: string.min(1), descricao?: string, ordem?: number }
updateSchema = createSchema.partial() + concluido?: boolean (para PUT completo se necessário)
```

`ordem` default: `max(ordem) + 1` na fase ao criar se omitido.

## Risks / Trade-offs

- **[Risco] Usuário exclui itens do seed** → Mitigação: confirmação; seed não re-roda se count > 0
- **[Risco] Fases com nomes inconsistentes** → Mitigação: datalist sugere fases existentes; operador pode padronizar manualmente
- **[Trade-off] Sem drag reorder** → Campo ordem numérico no modal

## Migration Plan

1. Estender API (backward-compatible)
2. Atualizar `PlanoAtaqueClient` com botões + modal
3. Smoke test: criar item, editar, excluir, toggle concluído

Rollback: reverter UI; API additions são aditivas.

## Open Questions

1. Botões "mover para cima/baixo" inline além do campo ordem? *(Default: só campo ordem no MVP.)*
