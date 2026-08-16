## Why

O operador aloca budget no produto e cadastra campanha no catálogo, mas não tem tela para consultar a campanha nem campo para registrar gasto. O CSV de performance foi retirado da UI e o rollup fica zerado. As abas do módulo listam Radar à esquerda enquanto `/afiliados` abre Contas de tráfego — a aba inicial não coincide com a ordem visual.

## What Changes

- **Ficha de campanha:** página própria (`/afiliados/campanhas/[id]`) para consultar e editar uma `Campanha` (nome Ads, geo, estratégia, papel, status, budgets, conta, datas, link do painel). O catálogo deixa de ser o único lugar: a linha expandida e o `+ Campanha` passam a apontar para essa ficha.
- **Gasto manual:** na ficha, input de gasto acumulado até uma data (default = hoje). Grava/substitui `CampanhaSnapshot` daquela data e dispara `recomputeProdutoRollups`. Sem UI de CSV nesta change (endpoint de import permanece).
- **Navegação:** aba **Contas de tráfego** vai para a esquerda (primeira) no `AfiliadosMainNav`, coerente com `/afiliados` como tela inicial. Sem troca de rotas e sem redirect. Sidebar do item Afiliados volta a `/afiliados` para a aba esquerda nascer selecionada.

## Capabilities

### New Capabilities

- `campanha-ficha`: Ficha operacional da `Campanha` (consulta + edição) e registro de gasto via snapshot manual; catálogo como índice com link para a ficha.

### Modified Capabilities

- `produtos-afiliados`: listagem/expand do catálogo navega para a ficha da campanha em vez de ser o único ponto de consulta.
- `afiliados-radar-decisao`: ordem das abas do módulo — Contas de tráfego à esquerda; entrada da sidebar em `/afiliados` (Contas), não no Radar.
- `afiliados-conta-trafego`: a lista em `/afiliados` é a view inicial do módulo (sidebar + primeira aba).

## Impact

- **UI:** nova page client da ficha; `CatalogoClient` (links, `+ Campanha`); `AfiliadosMainNav` (ordem); `sidebar.tsx` (href).
- **API:** endpoint autenticado para upsert de um snapshot (gasto + data) por campanha; CRUD de campanha já existe (`GET/PATCH /api/afiliados/campanhas/[id]`). Import CSV de campanha **não** ganha UI.
- **Schema:** nenhum modelo novo. Reusa `Campanha` + `CampanhaSnapshot`.
- **Rollups / widget de capital:** continuam lendo `gastoTotalAcumulado` derivado do latest snapshot — passam a ter fonte na ficha.
- **Fora de escopo:** CSV de Ads, Go! criar `Campanha` automaticamente, aba global de todas as campanhas, edição de rollup no produto.
