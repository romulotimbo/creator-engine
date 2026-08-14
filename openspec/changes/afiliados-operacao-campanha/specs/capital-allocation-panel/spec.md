## MODIFIED Requirements

### Requirement: getActiveCapitalAllocation function
A função `getActiveCapitalAllocation()` SHALL retornar um objeto com:
- `periodo`: `YYYY-MM` do período corrente (`America/Sao_Paulo`)
- `totalAvailableCapital`: `OrcamentoPeriodo.capitalTotalDisponivel` do período corrente (com fallback descrito em `orcamento-periodo`); NUNCA de campos individuais de `OfertaDecisao`
- `currency`: `OrcamentoPeriodo.moedaBase` (fallback `PortfolioConfig.currency` ou `"USD"`)
- `totalAllocated`: soma de `ProdutoAfiliado.budgetTesteAlocado` dos produtos com `statusOperacional IN ('TESTANDO', 'ESCALANDO')` (excluindo `null`)
- `totalSpent`: soma de `ProdutoAfiliado.gastoTotalAcumulado` dos mesmos produtos (null = 0)
- `totalFree`: `totalAvailableCapital - totalAllocated`
- `pctConsumed`: `totalSpent / totalAvailableCapital` se capital > 0; senão `null`
- `allocations`: lista de `{ produtoId, nome, statusOperacional, budgetTesteAlocado, gastoTotalAcumulado, alertaOrcamentoEstourado }`
- `alerts`: produtos/campanhas com alerta de orçamento estourado

Ofertas `OfertaDecisao` em `APROVADO_TESTE`/`EM_EXECUCAO` **sem** produto NÃO entram em `totalAllocated`.

#### Scenario: Aggregate active products
- **WHEN** existem 2 produtos `TESTANDO` com budget 500 e 800 e 1 `ESCALANDO` com 1000, e capital do período 5000
- **THEN** `totalAllocated = 2300`, `totalFree = 2700`

#### Scenario: Offers without product are excluded
- **WHEN** uma `OfertaDecisao` está `APROVADO_TESTE` com `budgetTesteAlocado = 400` e ainda não gerou produto
- **THEN** esse 400 NÃO entra em `totalAllocated`

#### Scenario: Null budgets are treated as zero
- **WHEN** um produto `TESTANDO` tem `budgetTesteAlocado = null`
- **THEN** contribui com `0` para `totalAllocated` (sem erro)

#### Scenario: Spent comes from campaign rollups
- **WHEN** os produtos ativos têm `gastoTotalAcumulado` 200, 0 e 350
- **THEN** `totalSpent = 550` e `pctConsumed = 550 / totalAvailableCapital`

### Requirement: Capital allocation widget in Afiliados module
O módulo de Afiliados SHALL exibir um widget agregado (fora da tela individual de oferta) com os dados de `getActiveCapitalAllocation()`, mostrando lado a lado capital total, alocado (planejado), gasto (realizado), livre e % do orçamento do período já consumido, mais a lista de alertas.

#### Scenario: Widget shows planned vs actual
- **WHEN** o operador acessa o módulo de Afiliados
- **THEN** o widget exibe `totalAvailableCapital`, `totalAllocated`, `totalSpent`, `totalFree`, `pctConsumed` e a lista de alocações por produto ativo

#### Scenario: Widget is not per-offer
- **WHEN** o operador visualiza uma oferta individual
- **THEN** o widget de capital NÃO está embutido na tela da oferta individual — ele está no nível do módulo (página Radar ou componente de layout)

#### Scenario: Alerta de estouro no widget
- **WHEN** um produto `TESTANDO` tem `gastoTotalAcumulado > budgetTesteAlocado`
- **THEN** o widget lista esse produto em `alerts`

#### Scenario: Capital ainda não configurado
- **WHEN** não há `OrcamentoPeriodo` nem `PortfolioConfig`
- **THEN** o widget mostra capital `0` e CTA para configurar (não quebra a página)
