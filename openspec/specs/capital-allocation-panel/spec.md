# capital-allocation-panel Specification

## Purpose
TBD - created by archiving change offer-governance-features. Update Purpose after archive.
## Requirements
### Requirement: PortfolioConfig singleton table
A tabela `PortfolioConfig` SHALL existir com `id = "default"` (upsert por ID único), contendo `totalAvailableCapital` (Decimal, required), `currency` (String, default `"USD"`), `updatedAt`. Representa o capital total disponível para o portfólio de testes de ofertas.

#### Scenario: Create or update global capital config
- **WHEN** o operador define `totalAvailableCapital = 5000` via UI de configurações
- **THEN** um `UPSERT` com `id = "default"` persiste o valor e atualiza `updatedAt`

#### Scenario: Single source of truth
- **WHEN** `getActiveCapitalAllocation()` é chamado
- **THEN** `totalAvailableCapital` vem exclusivamente de `PortfolioConfig`, nunca de campos individuais de `OfertaDecisao`

### Requirement: getActiveCapitalAllocation function
A função `getActiveCapitalAllocation()` SHALL retornar um objeto com:
- `totalAvailableCapital`: valor de `PortfolioConfig.totalAvailableCapital`
- `totalAllocated`: soma de `budgetTesteAlocado` de todas as `OfertaDecisao` com `statusDecisao IN ('APROVADO_TESTE', 'EM_EXECUCAO')` (excluindo `null`)
- `totalFree`: `totalAvailableCapital - totalAllocated`
- `allocations`: lista de `{ ofertaId, nome, statusDecisao, budgetTesteAlocado }` para cada oferta ativa

#### Scenario: Aggregate active offers
- **WHEN** existem 3 ofertas com `statusDecisao = 'APROVADO_TESTE'` e `budgetTesteAlocado` de $500, $800 e $200, e 1 oferta `EM_EXECUCAO` com $1000
- **THEN** `totalAllocated = 2500`, `totalFree = totalAvailableCapital - 2500`

#### Scenario: Offers in other statuses are excluded
- **WHEN** existem ofertas com `statusDecisao = 'GARIMPO'`, `'PAUSADO'` ou `'DESCARTADO'`
- **THEN** `budgetTesteAlocado` dessas ofertas NÃO é incluído em `totalAllocated`

#### Scenario: Null budgets are treated as zero
- **WHEN** uma oferta ativa tem `budgetTesteAlocado = null`
- **THEN** contribui com `0` para `totalAllocated` (sem erro)

### Requirement: Capital allocation widget in Afiliados module
O módulo de Afiliados SHALL exibir um widget agregado (fora da tela individual de oferta) com os dados de `getActiveCapitalAllocation()`.

#### Scenario: Widget shows capital summary
- **WHEN** o operador acessa o módulo de Afiliados (página de Radar ou sidebar)
- **THEN** o widget exibe `totalAvailableCapital`, `totalAllocated`, `totalFree` e a lista de alocações por oferta ativa

#### Scenario: Widget is not per-offer
- **WHEN** o operador visualiza uma oferta individual
- **THEN** o widget de capital NÃO está embutido na tela da oferta individual — ele está no nível do módulo (página Radar ou componente de layout)

