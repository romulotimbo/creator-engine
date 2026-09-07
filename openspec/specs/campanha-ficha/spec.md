# campanha-ficha Specification

## Purpose
Ficha operacional da Campanha em `/afiliados/campanhas/[id]`: consulta e edição dos dados da campanha, registro de gasto acumulado via snapshot manual, e o catálogo como índice com link para essa ficha.
## Requirements
### Requirement: Ficha operacional da Campanha
O sistema SHALL exibir uma ficha autenticada em `/afiliados/campanhas/[id]` com os dados da `Campanha`: `nomeCampanhaGoogleAds`, `geo`, `estrategia`, `papelConta`, `status`, `budgetDiarioDefinido`, `budgetTesteAlocado`, `contaTrafego` / `nomeContaAds`, `dataInicio` / `dataFim`, `linkPainelGoogleAds`, `moeda`, `linkBridge`, `tipoBridge`, `bridgeObservacoes`, `motivoEncerramento`, e o produto pai (nome + link para o catálogo). A ficha SHALL exibir também os rollups próprios da campanha (`gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`, `cpaReal`, calculados a partir de vendas confirmadas) como somente leitura, distintos e ao lado dos valores reportados pelo Ads (`CampanhaSnapshot.receitaConfirmada`, rotulado como referência/auditoria). A ficha SHALL permitir editar os campos editáveis via `PATCH /api/afiliados/campanhas/[id]`.

#### Scenario: Abrir ficha existente
- **WHEN** o operador autenticado navega para `/afiliados/campanhas/{id}` de uma campanha persistida
- **THEN** a página mostra os campos da campanha, o nome do produto pai, e os dois conjuntos de números (rollup por venda vs. referência do Ads)

#### Scenario: Campanha inexistente
- **WHEN** o id não corresponde a nenhuma `Campanha`
- **THEN** o sistema responde 404

#### Scenario: Editar budget, status e LP bridge na ficha
- **WHEN** o operador grava `budgetTesteAlocado = 400`, `status = PAUSADO` e `tipoBridge = VSL`
- **THEN** o sistema persiste via PATCH e reexibe os valores salvos

#### Scenario: Encerrar campanha com motivo estruturado
- **WHEN** o operador muda `status` para `ENCERRADO` e seleciona `motivoEncerramento`
- **THEN** o sistema persiste o motivo (Falha de Execução ou Falha de Mercado) junto com o novo status

#### Scenario: Não autenticado
- **WHEN** um visitante sem sessão acessa a ficha ou o PATCH
- **THEN** o sistema rejeita (redirect de auth ou 401)

### Requirement: Gasto manual via snapshot
O sistema SHALL aceitar na ficha um input de gasto acumulado até uma data (`dataSnapshot`, default = hoje no fuso `America/Sao_Paulo`). O save MUST chamar `POST /api/afiliados/campanhas/[id]/snapshots` com `gasto` ≥ 0 e `dataSnapshot`. Unique `(campanhaId, dataSnapshot)`: data nova cria linha; mesma data substitui. Após a escrita o servidor MUST chamar `recomputeProdutoRollups(produtoId)`. A UI do produto continua tratando `gastoTotalAcumulado` como somente leitura. Não há UI de import CSV de campanha nesta capability.

#### Scenario: Primeiro gasto da campanha
- **WHEN** a campanha não tem snapshots e o operador salva gasto `250` em `2026-08-15`
- **THEN** um `CampanhaSnapshot` é criado e `ProdutoAfiliado.gastoTotalAcumulado` passa a incluir `250` no rollup

#### Scenario: Regravação do mesmo dia
- **WHEN** já existe snapshot em `2026-08-15` com gasto `250` e o operador salva `400` na mesma data
- **THEN** aquele snapshot passa a `400` e nenhum segundo registro do dia é criado; o rollup usa `400`

#### Scenario: Datas diferentes acumulam histórico
- **WHEN** existem snapshots `gasto = 100` em `2026-08-01` e o operador salva `400` em `2026-08-15`
- **THEN** ambos permanecem; o rollup do produto usa somente o latest (`400`)

#### Scenario: Label deixa claro que é acumulado
- **WHEN** o operador abre o bloco de gasto na ficha
- **THEN** o rótulo indica gasto acumulado até a data (total da campanha, não o valor do dia)

#### Scenario: Gasto negativo rejeitado
- **WHEN** o operador envia `gasto < 0`
- **THEN** a API rejeita com 422 e o snapshot não muda

### Requirement: Histórico de snapshots na ficha
A ficha SHALL listar os `CampanhaSnapshot` da campanha (data, gasto) em ordem decrescente de `dataSnapshot`, somente leitura.

#### Scenario: Lista após dois saves
- **WHEN** a campanha tem snapshots em `2026-08-01` e `2026-08-15`
- **THEN** a ficha lista as duas linhas, a mais recente primeiro

#### Scenario: Sem snapshots
- **WHEN** a campanha nunca teve gasto gravado
- **THEN** a lista mostra estado vazio e o gasto do produto permanece `null` se for a única campanha sem snapshot

### Requirement: Checkout como campo de CampanhaSnapshot
O sistema SHALL exibir `checkoutsCount` (acumulado por campanha × dia, três estados: real/manual/não coletado) na ficha, ao lado do gasto. Quando o `ConversionPoint` do produto for `VALID_CC_SUBMIT`, o sistema SHALL tratar `checkoutsCount` como a própria métrica de conversão primária, sem exigir segunda coleta.

#### Scenario: Checkout presente
- **WHEN** `checkoutsCount` acumulado da campanha é maior que zero
- **THEN** a ficha exibe o valor e o alerta de teste (>US$100) considera presença (`> 0`), sem checar qualidade/recência

### Requirement: LP bridge como atributo da campanha
O sistema SHALL tratar landing page bridge como atributo de `Campanha` (`linkBridge`, `tipoBridge` enum fechado `TSL`|`VSL`|`ADVERTORIAL`|`QUIZ`|`REVIEW`|`DIRECT_LINK`|`OUTRO`, `bridgeObservacoes` texto livre), não como entidade própria — cada teste de bridge é uma campanha nova, sem reuso de identidade.

#### Scenario: Duas campanhas testando bridges diferentes
- **WHEN** o mesmo produto tem duas campanhas com `tipoBridge` diferente
- **THEN** cada campanha mantém seu próprio `linkBridge`/`tipoBridge`, comparáveis lado a lado na listagem

### Requirement: Histórico de status da campanha
O sistema SHALL registrar toda mudança de `Campanha.status` em `CampanhaStatusLog` (mesmo formato de `PersonaStatusLog`: status anterior, novo status, timestamp, motivo opcional), exibido na ficha como histórico somente leitura.

#### Scenario: Mudança de status gera log
- **WHEN** o operador muda `Campanha.status` de `TESTANDO` para `ESCALANDO`
- **THEN** o sistema cria uma entrada em `CampanhaStatusLog` com os dois status e o timestamp

### Requirement: Fila de decisão embutida na ficha
A ficha SHALL exibir, somente leitura, os `ItemFila` abertos com `tipoAlvo=CAMPANHA` e `alvoId` daquela campanha.

#### Scenario: Item de fila visível na ficha
- **WHEN** existe um `ItemFila` `ABERTO` para a campanha (ex.: teto de teste atingido)
- **THEN** a ficha exibe o item, com link para confirmá-lo na tela de fila

