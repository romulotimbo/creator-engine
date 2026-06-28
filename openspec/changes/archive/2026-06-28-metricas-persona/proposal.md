## Why

O Creator Engine já persiste métricas em `MetricaHistorica` e expõe `POST /api/metricas`, mas **não há interface** para registrar seguidores, engajamento ou receita por conta de plataforma. O valor só é definido na criação da persona (`/personas/nova`); depois disso o operador depende de SQL/Prisma Studio ou chamadas manuais à API.

Isso quebra o fluxo operacional diário (abrir rede → ver número → registrar) e impede análise de tendência — os gráficos do hub e do `/analytics` ficam vazios ou desatualizados, e os alertas “conta sem métrica há 3+ dias” viram ruído permanente.

## What Changes

- Nova página **`/personas/[slug]/metricas`** dedicada a registro e análise de métricas por conta
- Cards de resumo por plataforma (valor atual, delta vs. snapshot anterior, progresso da meta)
- Gráfico de série temporal (seguidores por plataforma) com filtro de período (30d / 90d / 6m / tudo)
- Tabela histórica com coluna de delta (crescimento entre snapshots)
- Modal **“Registrar métrica”** por conta (seguidores obrigatório; engajamento, posts do dia, receita do dia opcionais)
- Extensão da API de métricas: `GET` com filtros, `POST` com data customizável e upsert no mesmo dia/conta, `PUT`/`DELETE` por snapshot
- Link **Métricas** na navegação do hub da persona; hub mantém preview compacto com link “Ver métricas →”

## Capabilities

### New Capabilities

- `metricas-persona`: Página de métricas, UI de registro/análise e API REST completa para `MetricaHistorica`

### Modified Capabilities

_(Nenhuma — `openspec/specs/` vazio.)_

## Impact

- **Novas rotas UI:** `src/app/(dashboard)/personas/[slug]/metricas/` (+ client components)
- **API:** estender `src/app/api/metricas/route.ts`; novo `src/app/api/metricas/[id]/route.ts`
- **Navegação:** `page.tsx` hub da persona (nav links)
- **Sem mudança de schema Prisma** — modelos `ContaPlataforma` e `MetricaHistorica` já suportam o fluxo
- **Analytics global:** passa a ser alimentado organicamente pelos snapshots registrados na UI
