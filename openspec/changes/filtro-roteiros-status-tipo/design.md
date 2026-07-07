## Context

A página de roteiros (`/personas/[slug]/roteiros`) carrega todos os `Post` da persona no server component e passa para `RoteirosClient` como `initialPosts`. A tabela renderiza a lista completa sem filtros.

Infraestrutura já existente:
- `GET /api/posts?personaId=&status=&tipo=` — filtros no backend
- `GET /api/posts/export?personaId=&status=` — export com filtro de status (falta `tipo`)
- `POST_STATUS_LABELS` e `TIPO_POST_LABELS` em `@/lib/utils`
- Padrão de filtro client-side em `DiscoveryClient` e `MetricasClient`

Personas com importação massiva (500+ roteiros) tornam a listagem difícil de operar sem filtros.

## Goals / Non-Goals

**Goals:**
- Dois filtros na UI: status e tipo, combináveis (AND)
- Contador visível (filtrados vs. total)
- Estado vazio quando filtro não retorna resultados
- Export XLSX alinhado aos filtros ativos
- URL compartilhável com filtros (`searchParams`)

**Non-Goals:**
- Filtro por pilar, conta ou busca textual (futuro)
- Paginação ou virtualização da tabela
- Refetch server-side ao mudar filtro (client-side é suficiente com dados já carregados)
- Filtros no calendário ou calendário global

## Decisions

### 1. Filtro client-side vs. server-side

**Decisão:** filtro client-side em `RoteirosClient` com `useMemo`, igual ao Discovery.

**Rationale:** a página já carrega todos os posts; evita round-trip extra e mantém mudança de filtro instantânea. Volume típico (< 2k posts/persona) é aceitável em memória.

**Alternativa descartada:** `searchParams` no server + `db.post.findMany` com where — melhor para volumes enormes, mas adiciona complexidade e `router.push` a cada mudança de filtro sem ganho imediato.

### 2. Persistência na URL

**Decisão:** sincronizar filtros com `useSearchParams` + `router.replace` (shallow), sem refetch.

**Rationale:** permite bookmark e voltar do modal mantendo filtros; não invalida o server component.

**Alternativa:** só estado React — mais simples, mas perde URL compartilhável (requisito da proposal).

### 3. Posição dos controles

**Decisão:** barra de filtros entre o header de ações (Import/Export/Novo) e a tabela, alinhada à esquerda com gap consistente (`DiscoveryClient`).

Labels: "Todos os status" / "Todos os tipos" como primeira opção vazia.

### 4. Contador no título

**Decisão:** `PersonaSectionHeader` recebe título dinâmico do client via estado elevado ou subtítulo abaixo dos filtros.

**Implementação preferida:** contador inline na barra de filtros (`Mostrando 42 de 521`) para não exigir refatorar o header server-side. O `page.tsx` mantém `Roteiros (N)` com total bruto; o client mostra detalhe quando filtro ativo.

### 5. Export alinhado

**Decisão:** montar URL de export com `status` e `tipo` ativos; estender `export/route.ts` para aceitar `tipo` (paridade com GET /api/posts).

### 6. Numeração da coluna `#`

**Decisão:** índice da linha reflete posição na lista **filtrada** (1, 2, 3…), não o índice global.

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Lista muito grande degrada performance do filtro | `useMemo`; se necessário no futuro, migrar para server-side |
| URL com params inválidos | Validar contra enums conhecidos; ignorar valor desconhecido |
| Export sem `tipo` hoje | Adicionar param em `export/route.ts` (1 linha no where) |
| Filtro ativo + import replace confunde contagem | `router.refresh` recarrega total; filtros persistem na URL |

## Migration Plan

Deploy único, sem migration de banco. Rollback = reverter commit da UI.

## Open Questions

_(Nenhuma — escopo fechado.)_
