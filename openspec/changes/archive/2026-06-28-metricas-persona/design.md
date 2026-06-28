## Context

`MetricaHistorica` armazena snapshots por `contaId` com campos `data`, `seguidores`, `engajamento`, `receitaDia`, `postsPublicados`. `ContaPlataforma.seguidoresAtual` é o cache do último valor conhecido.

`POST /api/metricas` já atualiza conta + cria snapshot em transação, mas sempre com `data: new Date()` e sem UI. O hub da persona agrega `MetricaHistorica` para `PersonaCharts`, mas não permite entrada de dados.

Padrão do projeto: Server Component page + Client modal + API routes + `router.refresh()` + Recharts para gráficos + inline styles com CSS variables.

## Goals / Non-Goals

**Goals:**

- Entregar página `/personas/[slug]/metricas` como local único para registrar e analisar métricas de uma persona
- Suportar backfill (data passada) e correção (editar/excluir snapshot)
- Calcular delta entre snapshots consecutivos por conta na UI
- Alimentar gráficos existentes (hub preview + analytics global) via novos registros

**Non-Goals:**

- Import automático de APIs das plataformas (Instagram Graph API, etc.)
- Integração com hermes-agent nesta change
- Métricas cross-persona (permanece em `/analytics`)
- Alterar schema Prisma ou adicionar novos tipos de métrica

## Decisions

### D1 — Rota dedicada em vez de modal só no hub

**Decisão:** `/personas/[slug]/metricas` com 3 zonas (cards, gráfico, tabela).

**Alternativa rejeitada:** Modal inline nos cards do hub — insuficiente para histórico longo e filtros de período.

### D2 — Upsert por conta + dia (data calendar)

**Decisão:** Se já existir `MetricaHistorica` para mesma `contaId` na mesma data (comparar por dia calendário pt-BR / UTC date part), `POST` substitui o snapshot existente em vez de duplicar.

**Racional:** Operador registra uma vez por semana; correção no mesmo dia não deve criar linhas duplicadas no gráfico.

### D3 — `seguidoresAtual` atualizado apenas se snapshot for o mais recente

**Decisão:** No POST/PUT, atualizar `ContaPlataforma.seguidoresAtual` somente se a `data` do snapshot ≥ data do snapshot mais recente da conta (ou se for o único).

**Racional:** Backfill de data antiga não deve regredir o “valor atual” exibido no dashboard.

### D4 — Delta calculado na UI (server ou client)

**Decisão:** Ordenar snapshots por `data` asc por conta; delta = `seguidores[n] - seguidores[n-1]`. Exibir “+38 (7d)” nos cards usando diff entre snapshot mais recente e snapshot de ~7 dias atrás (ou anterior mais próximo).

**Alternativa rejeitada:** Coluna `delta` no banco — derivado, não persistir.

### D5 — API surface

| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/metricas?personaId=&contaId=&from=&to=` | Lista snapshots |
| POST | `/api/metricas` | Cria ou upserta snapshot + atualiza conta se aplicável |
| PUT | `/api/metricas/[id]` | Edita snapshot |
| DELETE | `/api/metricas/[id]` | Remove snapshot; recalcula `seguidoresAtual` do último restante |

Validação com Zod; auth obrigatória em todas as rotas.

### D6 — Hub mantém preview, não duplica funcionalidade

**Decisão:** Hub conserva gráfico compacto de seguidores; adiciona link “Métricas” na barra de nav e “Ver métricas →” nos cards de conta.

### D7 — Período do gráfico no client

**Decisão:** Filtro 30d / 90d / 180d / tudo aplicado client-side sobre série já carregada pelo server component (volume baixo para solo ops).

## Risks / Trade-offs

- **[Risco] Poucos snapshots no início** → Gráfico e delta vazios; estado vazio com CTA “Registrar primeira métrica”
- **[Risco] Timezone na comparação de “mesmo dia”** → Normalizar para início do dia UTC ou usar date-only no body (`YYYY-MM-DD`); documentar no modal
- **[Trade-off] PUT/DELETE no MVP** → Incluídos no escopo porque correção de erro é parte da análise confiável; sem eles o histórico fica “sujeira permanente”

## Migration Plan

1. Estender API (backward-compatible: POST sem `data` continua usando hoje)
2. Implementar página e modal
3. Adicionar links de navegação
4. Smoke test: registrar 2 snapshots, verificar gráfico hub + analytics

Rollback: remover rota UI; API additions são aditivas.

## Open Questions

1. Exibir `postsPublicados` auto-calculado a partir de `Post` PUBLICADO na data, ou só manual no modal? *(Default: manual no MVP; hint opcional no design futuro.)*
2. FanVue: meta de seguidores nem sempre se aplica — cards já tratam `metaSeguidores` nullable.
