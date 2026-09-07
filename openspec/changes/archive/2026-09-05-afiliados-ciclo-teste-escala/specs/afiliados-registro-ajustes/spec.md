## ADDED Requirements

### Requirement: Registro de AjusteCampanha
O sistema SHALL registrar todo ajuste aplicado a uma campanha em `AjusteCampanha`, com `origem` (`FILA`|`MANUAL`), `tipo` (`BUDGET`|`CPA_ALVO`|`LANCE_SEGMENTO`), `valorAnterior`/`valorNovo` (`Decimal?`), `data` (timestamp completo) e `motivo` opcional. O sistema NÃO SHALL inferir ajustes por diff entre snapshots — captura é sempre por confirmação de `ItemFila` ou registro manual explícito.

#### Scenario: Confirmar item de fila registra o ajuste
- **WHEN** o operador confirma um `ItemFila` de ajuste de budget e informa o valor efetivamente aplicado
- **THEN** o sistema cria `AjusteCampanha` com `origem=FILA`, `itemFilaId` do item confirmado, e o valor real digitado (não a faixa recomendada)

#### Scenario: Registro manual fora da fila
- **WHEN** o operador registra um ajuste diretamente na ficha da campanha, sem um `ItemFila` associado
- **THEN** o sistema cria `AjusteCampanha` com `origem=MANUAL` e `itemFilaId` nulo

#### Scenario: Um item de fila gera múltiplos ajustes
- **WHEN** um `ItemFila` empacota geo e dispositivo (otimização de segmento) e o operador confirma ajustes distintos para cada segmento
- **THEN** o sistema cria um `AjusteCampanha` por segmento confirmado, todos referenciando o mesmo `itemFilaId`

#### Scenario: Data retroativa só em ajuste manual
- **WHEN** o ajuste tem `origem=MANUAL`
- **THEN** o operador pode editar `data` para um instante passado; quando `origem=FILA`, `data` é fixada no instante da confirmação
