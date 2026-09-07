## MODIFIED Requirements

### Requirement: getActiveCapitalAllocation function
A função `getActiveCapitalAllocation()` SHALL retornar um objeto com:
- `periodo`: `YYYY-MM` do período corrente (`America/Sao_Paulo`)
- `totalAvailableCapital`: `OrcamentoPeriodo.capitalTotalDisponivel` do período corrente (fallback `PortfolioConfig` / 0)
- `currency`: `OrcamentoPeriodo.moedaBase` (fallback `PortfolioConfig.currency` ou `"USD"`)
- `totalAllocated`: soma de `ProdutoAfiliado.budgetTesteAlocado` dos produtos com `status = ATIVO` que tenham ao menos uma `Campanha` em `TESTANDO` ou `ESCALANDO` (null = 0). Produto `PAUSADO`/`ARQUIVADO` NÃO reserva capital.
- `totalSpent`: soma de `ProdutoAfiliado.gastoTotalAcumulado` de produtos com gasto (inclui `PAUSADO`/`ARQUIVADO`; null = 0)
- `totalFree`: `totalAvailableCapital - totalAllocated`
- `pctConsumed`: `totalSpent / totalAvailableCapital` se capital > 0; senão `null`
- `allocations`: lista de produtos `ATIVO` com campanha no ar, mais produtos pausados/arquivados que tenham gasto, cada um com `{ produtoId, nome, status, budgetTesteAlocado, gastoTotalAcumulado, alertaOrcamentoEstourado }`
- `alerts`: somente produtos que satisfazem o requisito “Alerta de orçamento estourado sem decisão”

`OfertaDecisao` sem produto NÃO entra em `totalAllocated`. `ProdutoAfiliado.statusOperacional` NÃO SHALL ser lido.

#### Scenario: Aggregate active products
- **WHEN** existem 2 produtos `ATIVO` com campanha `TESTANDO` e budget 500 e 800, 1 `ATIVO` com campanha `ESCALANDO` e budget 1000, e capital do período 5000
- **THEN** `totalAllocated = 2300`, `totalFree = 2700`

#### Scenario: Produto pausado libera alocado e conserva gasto
- **WHEN** um produto `PAUSADO` tem `budgetTesteAlocado = 40` e `gastoTotalAcumulado = 96.57`, e não há campanha `TESTANDO`/`ESCALANDO`
- **THEN** os 40 NÃO entram em `totalAllocated`, os 96.57 entram em `totalSpent`, e o produto NÃO entra em `alerts`

#### Scenario: Offers without product are excluded
- **WHEN** uma `OfertaDecisao` está `APROVADO_TESTE` com `budgetTesteAlocado = 400` e ainda não gerou produto
- **THEN** esse 400 NÃO entra em `totalAllocated`

#### Scenario: Null budgets are treated as zero
- **WHEN** um produto `ATIVO` com campanha `TESTANDO` tem `budgetTesteAlocado = null`
- **THEN** contribui com `0` para `totalAllocated` (sem erro)

### Requirement: Capital allocation widget in Afiliados module
O módulo de Afiliados SHALL exibir um widget agregado (Radar) com os dados de `getActiveCapitalAllocation()`, mostrando capital total, alocado (planejado dos testes no ar), gasto (realizado, inclusive pausados), livre, % consumido, lista de alocações e o bloco de alertas só quando houver `alerts`.

#### Scenario: Widget shows planned vs actual
- **WHEN** o operador acessa o Radar
- **THEN** o widget exibe `totalAvailableCapital`, `totalAllocated`, `totalSpent`, `totalFree`, `pctConsumed` e as alocações

#### Scenario: Widget is not per-offer
- **WHEN** o operador visualiza o modal de uma oferta
- **THEN** o widget de capital NÃO está embutido nesse modal

#### Scenario: Alerta some quando não há decisão pendente
- **WHEN** o único produto com gasto > budget está `PAUSADO` ou só tem campanhas `PAUSADO`/`ENCERRADO` ou já tem `ItemFila` terminal `teste.tetoComissao`
- **THEN** o widget NÃO exibe o bloco “Orçamento estourado sem decisão”

#### Scenario: Capital ainda não configurado
- **WHEN** não há `OrcamentoPeriodo` nem `PortfolioConfig`
- **THEN** o widget mostra capital `0` e CTA para configurar (não quebra a página)

## ADDED Requirements

### Requirement: Alerta de orçamento estourado sem decisão
O sistema SHALL sinalizar `alertaOrcamentoEstourado` (payload de capital e catálogo) somente quando as quatro condições forem verdadeiras: `ProdutoAfiliado.status = ATIVO`; existe `Campanha` do produto com `status = TESTANDO`; `gastoTotalAcumulado > budgetTesteAlocado` (budget > 0); e nenhuma dessas campanhas `TESTANDO` possui `ItemFila` em estado terminal (`APLICADO`|`DISPENSADO`|`EXPIRADO`) com `regra = teste.tetoComissao`. O título do bloco no widget SHALL permanecer “Orçamento estourado sem decisão” e NÃO SHALL aparecer quando a conjunção falhar.

#### Scenario: Teste no ar sem fila resolvida
- **WHEN** o produto está `ATIVO`, uma campanha está `TESTANDO`, gasto 96.57 > budget 40, e não há `ItemFila` terminal `teste.tetoComissao` dessa campanha
- **THEN** o produto entra em `alerts`

#### Scenario: Fila já respondida
- **WHEN** as mesmas cifras valem mas existe `ItemFila` `APLICADO` (ou `DISPENSADO`/`EXPIRADO`) com `regra = teste.tetoComissao` para a campanha `TESTANDO`
- **THEN** o alerta NÃO é emitido

#### Scenario: Produto pausado
- **WHEN** gasto > budget e `ProdutoAfiliado.status = PAUSADO`
- **THEN** o alerta NÃO é emitido

#### Scenario: Sem campanha testando
- **WHEN** o produto está `ATIVO`, gasto > budget, e todas as campanhas estão `PAUSADO` ou `ENCERRADO`
- **THEN** o alerta NÃO é emitido

#### Scenario: Escalando não usa este alerta
- **WHEN** a única campanha no ar está `ESCALANDO` e gasto > budget
- **THEN** o alerta NÃO é emitido
