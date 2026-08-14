## ADDED Requirements

### Requirement: Entidade Campanha vinculada ao ProdutoAfiliado
O sistema SHALL persistir uma entidade `Campanha` com: `id`, `produtoId` (FK para `ProdutoAfiliado`, Cascade), `contaTrafegoId` (FK opcional para `ContaTrafego`, SetNull), `nomeContaAds` (String, nullable), `nomeCampanhaGoogleAds` (String, required), `geo` (String, nullable), `estrategia` (`EstrategiaCampanha`: `REVIEW_BOTTOM_FUNNEL` | `GENERIC_TOP_FUNNEL` | `BRANDED_BIDDING`, nullable), `papelConta` (`PRINCIPAL` | `CONTINGENCIA`, default `PRINCIPAL`), `dataInicio` / `dataFim` (DateTime, nullable), `status` (`StatusOperacional`: `TESTANDO` | `ESCALANDO` | `PAUSADO` | `ENCERRADO`, default `TESTANDO`), `budgetDiarioDefinido` / `budgetTesteAlocado` (Decimal, nullable), `linkPainelGoogleAds` (String, nullable), `dataUltimaAtualizacao` (DateTime, nullable), `moeda` (String, nullable), `createdAt`, `updatedAt`. A campanha SHALL pertencer ao produto, nunca à `OfertaDecisao`.

#### Scenario: Criar campanha em um produto
- **WHEN** o operador cria uma campanha informando `produtoId`, `nomeCampanhaGoogleAds` e opcionalmente geo, conta e estratégia
- **THEN** o sistema persiste a `Campanha` com `status = TESTANDO` e a lista na ficha operacional do produto

#### Scenario: Campanha não pode existir sem produto
- **WHEN** uma request de criação omite `produtoId` ou aponta para produto inexistente
- **THEN** o sistema rejeita com erro de validação (404 ou 422)

#### Scenario: Exclusão do produto remove campanhas
- **WHEN** um `ProdutoAfiliado` é excluído
- **THEN** todas as `Campanha` e respectivos `CampanhaSnapshot` são removidos em cascade

#### Scenario: Duas campanhas no mesmo produto (geos distintos)
- **WHEN** o produto Purotyn tem uma campanha `geo = DE` lucrativa e outra `geo = FR` no prejuízo
- **THEN** o sistema mantém dois registros independentes com status, budget e snapshots próprios

### Requirement: CampanhaSnapshot append-only por data
O sistema SHALL persistir `CampanhaSnapshot` com: `id`, `campanhaId` (FK Cascade), `dataSnapshot` (Date, required), `gasto`, `impressoes`, `cliques`, `ctr`, `conversoes`, `cvr`, `cpcMedio`, `cpaReal`, `receitaConfirmada`, `roiReal` (numéricos nullable conforme o CSV), `createdAt`. Constraint unique `(campanhaId, dataSnapshot)`. Cada import cria uma linha nova para uma data nova; reimport da mesma data substitui somente aquele snapshot.

#### Scenario: Import cria snapshot novo
- **WHEN** o operador importa um CSV para o produto com `dataSnapshot = 2026-08-14` e uma linha cujo nome de campanha já existe
- **THEN** um novo `CampanhaSnapshot` é gravado e `Campanha.dataUltimaAtualizacao` é atualizada para essa data

#### Scenario: Reimport do mesmo dia substitui o snapshot do dia
- **WHEN** já existe snapshot `(campanhaId, 2026-08-14)` e o operador reimporta CSV com a mesma data
- **THEN** os campos numéricos daquele snapshot são atualizados e nenhum segundo registro do dia é criado

#### Scenario: Datas diferentes acumulam histórico
- **WHEN** existem snapshots em 2026-08-01 e 2026-08-14 para a mesma campanha
- **THEN** ambos permanecem consultáveis; o rollup do produto usa somente o de 2026-08-14 (mais recente)

### Requirement: Import CSV de performance escopado ao produto
O sistema MUST expor `POST` autenticado para upload de CSV de performance de campanhas vinculado a um `produtoId`. Matching de linhas por `nomeCampanhaGoogleAds` normalizado (trim, case-insensitive) **apenas entre campanhas daquele produto**. Valores de gasto/receita são interpretados como **acumulados até `dataSnapshot`**. Linhas sem nome de campanha são rejeitadas. Nomes sem match criam `Campanha` stub (`status = TESTANDO`, geo/estratégia nulos).

#### Scenario: Match atualiza campanha existente
- **WHEN** o CSV contém `"Purotyn DE Review"` e já existe campanha com esse nome no produto
- **THEN** a linha vira `CampanhaSnapshot` nessa campanha e nenhuma campanha extra é criada

#### Scenario: Sem match cria campanha stub
- **WHEN** o CSV contém `"Purotyn FR Brand"` e o produto não tem campanha com esse nome
- **THEN** o sistema cria `Campanha` com `nomeCampanhaGoogleAds = "Purotyn FR Brand"`, `status = TESTANDO`, e o primeiro snapshot

#### Scenario: Nome em outro produto não faz match
- **WHEN** outro produto já tem campanha `"Generic Search"` e o CSV do produto atual também tem `"Generic Search"`
- **THEN** o sistema NÃO vincula o snapshot à campanha do outro produto — cria ou atualiza somente no produto do import

#### Scenario: Relatório de import
- **WHEN** o import termina
- **THEN** a resposta lista quantidades de campanhas criadas, snapshots criados, snapshots substituídos e linhas inválidas (com motivo)

### Requirement: Rollups automáticos no ProdutoAfiliado
O sistema SHALL manter em `ProdutoAfiliado` colunas denormalizadas somente leitura via API de edição manual: `gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`, `cpaReal`, `dataUltimaAtualizacaoDados`. Após cada escrita de snapshot, `recomputeProdutoRollups(produtoId)` MUST recalcular:

- `gastoTotalAcumulado` = soma do `gasto` do snapshot mais recente de cada campanha do produto (`null` tratado como 0)
- `receitaConfirmadaAcumulada` = soma análoga de `receitaConfirmada`
- `roiReal` = `(receita − gasto) / gasto` se gasto > 0; senão `null`
- `cpaReal` = `gasto / Σ conversoes` do latest snapshot de cada campanha se conversões > 0; senão `null`
- `dataUltimaAtualizacaoDados` = `max(dataSnapshot)` entre as campanhas
- `percentualBudgetConsumido` (derivado na API, não necessariamente coluna) = `gasto / budgetTesteAlocado` se budget > 0

#### Scenario: Rollup soma latest de duas campanhas
- **WHEN** a campanha DE tem latest `gasto = 400` e a FR tem latest `gasto = 250`
- **THEN** `ProdutoAfiliado.gastoTotalAcumulado = 650`

#### Scenario: Snapshot antigo não entra no rollup
- **WHEN** a campanha DE tem snapshots `gasto = 100` em 01/08 e `gasto = 400` em 14/08
- **THEN** o rollup usa 400, não 500

#### Scenario: Edição manual de rollup é ignorada
- **WHEN** uma request PUT no produto inclui `gastoTotalAcumulado` ou `roiReal`
- **THEN** os campos são stripped e o valor calculado prevalece

#### Scenario: Produto sem campanhas
- **WHEN** o produto não tem campanhas
- **THEN** gasto, receita, roi, cpa e data de atualização ficam `null` (não zero implícito de ROI)

### Requirement: Alerta de orçamento estourado por campanha e por produto
O sistema SHALL sinalizar alerta derivado (não coluna persistida) quando o gasto do latest snapshot (campanha) ou o rollup (produto) é maior que o `budgetTesteAlocado` correspondente (não-nulo e > 0) **e** o `status` operacional da entidade ainda é `TESTANDO`.

#### Scenario: Produto testando acima do budget
- **WHEN** `gastoTotalAcumulado = 1200`, `budgetTesteAlocado = 1000` e `statusOperacional = TESTANDO`
- **THEN** o payload do produto e o widget de capital incluem alerta de orçamento estourado

#### Scenario: Operador já escalou
- **WHEN** as mesmas cifras valem mas `statusOperacional = ESCALANDO`
- **THEN** o alerta de “estourou sem decisão” NÃO é emitido

#### Scenario: Campanha FR estoura, DE não
- **WHEN** a campanha FR está `TESTANDO` com gasto > budget da campanha e a DE está abaixo do budget
- **THEN** o alerta aparece na campanha FR e, se o rollup do produto também exceder o budget do produto em `TESTANDO`, no produto

### Requirement: CRUD e listagem de campanhas na ficha do produto
O sistema SHALL permitir criar, editar, listar e encerrar/excluir campanhas a partir da ficha operacional do Catálogo, incluindo link do painel Google Ads e status individual.

#### Scenario: Editar geo e estratégia de um stub
- **WHEN** o operador completa geo e estratégia de uma campanha criada pelo import
- **THEN** os campos são persistidos e o snapshot histórico permanece intacto

#### Scenario: Listar contas a partir das campanhas
- **WHEN** o produto tem três campanhas (conta A / DE / PRINCIPAL, conta A / FR / PRINCIPAL, conta B / DE / CONTINGENCIA)
- **THEN** a sub-lista de contas do catálogo mostra as três linhas com conta, geo, papel e status — não apenas “Contas: 3”
