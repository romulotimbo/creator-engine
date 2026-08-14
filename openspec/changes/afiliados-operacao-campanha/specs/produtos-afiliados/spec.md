## ADDED Requirements

### Requirement: Herança da Offer de origem no ProdutoAfiliado
Na conversão Go! (oferta → produto), o sistema SHALL copiar para `ProdutoAfiliado`: `ofertaDecisaoId` (já existente, exposto como link), `conversionPoint`, `tipoProduto`, `vertical` (se o produto passar a ter o campo; senão exibir via join da Offer), `ltvEstimadoRebill`, `scoreCalculado` → `scoreOrigem` (somente leitura daí em diante), `budgetTesteAlocado`, `cpaAlvoBreakeven`, `criterioPausa`, `criterioEscala`, `nextReviewAt`, `domainUsed`, `comissaoValor`. Depois da cópia, budget e critérios de pausa/escala no produto são independentes da Offer.

#### Scenario: Go! copia conversion point e score
- **WHEN** o operador executa “Go! Criar Campanha” em oferta com `conversionPoint = VALID_CC_SUBMIT`, `scoreCalculado = 82` e `budgetTesteAlocado = 500`
- **THEN** o `ProdutoAfiliado` nasce com esses valores, `scoreOrigem = 82`, e o catálogo exibe link clicável de volta ao Radar na oferta de origem

#### Scenario: Score origem não acompanha re-score da Offer
- **WHEN** a Offer é re-scorada para 90 depois do Go!
- **THEN** `ProdutoAfiliado.scoreOrigem` permanece 82

#### Scenario: Critério de pausa editável no produto
- **WHEN** o operador altera `criterioPausa` no produto
- **THEN** o texto do produto muda e `OfertaDecisao.criterioPausa` permanece o original

#### Scenario: Produto sem oferta de origem
- **WHEN** um produto é criado direto no catálogo (sem Go!)
- **THEN** os campos herdados ficam `null` e não há link para o Radar

### Requirement: Status operacional distinto do status comercial
`ProdutoAfiliado` SHALL ter `statusOperacional` (`TESTANDO` | `ESCALANDO` | `PAUSADO` | `ENCERRADO`, nullable até o primeiro teste) independente de `status` comercial (`ATIVO` | `PAUSADO` | `ARQUIVADO`). A listagem do Catálogo SHALL exibir os dois.

#### Scenario: Produto ativo comercialmente mas pausado na operação
- **WHEN** `status = ATIVO` e `statusOperacional = PAUSADO`
- **THEN** o catálogo mostra comercial Ativo e operacional Pausado — sem colapsar os dois num único selo

#### Scenario: Default no Go!
- **WHEN** o produto é criado pelo fluxo Go!
- **THEN** `statusOperacional = TESTANDO` e `status = ATIVO`

### Requirement: Datas de teste e de atualização de dados
`ProdutoAfiliado` SHALL ter `dataInicioTeste` (DateTime, nullable, editável; auto-preenchida com `min(Campanha.dataInicio)` na criação da primeira campanha) e `dataUltimaAtualizacaoDados` (somente leitura, `max` dos snapshots).

#### Scenario: Primeira campanha define início
- **WHEN** a primeira campanha é criada com `dataInicio = 2026-08-01`
- **THEN** `dataInicioTeste` do produto passa a 2026-08-01 se ainda era `null`

#### Scenario: CSV atualiza a data dos dados
- **WHEN** um snapshot com `dataSnapshot = 2026-08-14` é importado
- **THEN** `dataUltimaAtualizacaoDados = 2026-08-14`

### Requirement: Ficha operacional do Catálogo
A UI do Catálogo SHALL exibir, por produto: link da oferta origem, vertical/tipo, conversion point, LTV estimado, score origem, moeda, sub-lista de contas Ads (via campanhas), domínio(s) em uso, datas de início/atualização, status operacional, `budgetTesteAlocado`, `cpaAlvoBreakeven`, rollups (`gastoTotalAcumulado`, `cpaReal`, `receitaConfirmadaAcumulada`, `roiReal`, `% budget consumido`), `nextReviewAt`, critérios de pausa/escala.

#### Scenario: Conversion points diferentes não são tratados iguais
- **WHEN** o catálogo lista um produto `SALE` e outro `VALID_CC_SUBMIT`
- **THEN** cada um exibe o conversion point correspondente na ficha/listagem

#### Scenario: CPA alvo visível
- **WHEN** `cpaAlvoBreakeven` foi copiado ou calculado (`comissaoValor / (margemDesejadaPct/100)`)
- **THEN** o valor aparece na ficha financeira do produto

#### Scenario: Percentual de budget consumido
- **WHEN** `gastoTotalAcumulado = 400` e `budgetTesteAlocado = 1000`
- **THEN** a ficha mostra 40% de budget consumido

### Requirement: comissaoValor e cpaAlvoBreakeven no produto
`ProdutoAfiliado` SHALL persistir `comissaoValor` (Decimal, copiado da Offer) e `cpaAlvoBreakeven`. Se `cpaAlvoManual` é false (default), o sistema recalcula `cpaAlvoBreakeven = comissaoValor / (margemDesejadaPct/100)` com `margemDesejadaPct` default 100. Override manual seta `cpaAlvoManual = true` e não é sobrescrito pelo recálculo.

#### Scenario: Cálculo default de breakeven
- **WHEN** `comissaoValor = 83` e `margemDesejadaPct = 100` e `cpaAlvoManual = false`
- **THEN** `cpaAlvoBreakeven = 83`

#### Scenario: Override manual
- **WHEN** o operador grava `cpaAlvoBreakeven = 50` explicitamente
- **THEN** `cpaAlvoManual = true` e um recálculo posterior por mudança de comissão NÃO altera 50

### Requirement: Campos financeiros de rollup visíveis e não editáveis
A UI e a API de edição do produto MUST tratar `gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`, `cpaReal` e `dataUltimaAtualizacaoDados` como somente leitura.

#### Scenario: Formulário não oferece input de ROI
- **WHEN** o operador abre a edição do produto
- **THEN** ROI, gasto e receita acumulados aparecem como texto/indicadores, sem campos editáveis
