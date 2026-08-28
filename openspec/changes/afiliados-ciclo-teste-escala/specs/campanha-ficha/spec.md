## MODIFIED Requirements

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

## ADDED Requirements

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
