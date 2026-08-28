## ADDED Requirements

### Requirement: Modelo ItemFila com referência polimórfica fraca
O sistema SHALL manter `ItemFila` com `tipoAlvo` (`OFERTA`|`CAMPANHA`) e `alvoId` (string, sem foreign key formal), `regra` (identificador da regra que gerou o item), `prioridade` (`ALTA`|`MEDIA`|`BAIXA`, atribuída pela regra geradora, nunca recalculada pela fila), `resumo` (texto), `status` e timestamps. A condição de disparo de cada regra SHALL ser calculada em runtime — o sistema NÃO SHALL persistir a condição, só o ciclo de vida do item já gerado.

#### Scenario: Regra gera item de fila
- **WHEN** uma regra de decisão detecta uma condição de disparo (ex.: teto de teste atingido)
- **THEN** o sistema cria um `ItemFila` com `tipoAlvo=CAMPANHA`, `alvoId` da campanha, `prioridade` definida pela regra e `resumo` textual

### Requirement: Ciclo de vida de 5 estados com dedup
`ItemFila.status` SHALL ser um de `ABERTO`, `ADIADO`, `APLICADO`, `DISPENSADO`, `EXPIRADO`. O sistema SHALL deduplicar por `(regra, tipoAlvo, alvoId)` enquanto o item existente não estiver em estado terminal (`APLICADO`, `DISPENSADO`, `EXPIRADO`).

#### Scenario: Regra dispara de novo com item já aberto
- **WHEN** a mesma regra dispara novamente para o mesmo `(tipoAlvo, alvoId)` enquanto já existe um `ItemFila` `ABERTO` para essa combinação
- **THEN** o sistema não cria um segundo item — o existente permanece

#### Scenario: Regra dispara de novo após item terminal
- **WHEN** a mesma regra dispara para o mesmo alvo depois que o item anterior foi `APLICADO`
- **THEN** o sistema cria um novo `ItemFila`

### Requirement: Superfície dupla — fila própria e embed nas fichas
O sistema SHALL expor os `ItemFila` tanto em uma tela de fila própria (todos os itens não-terminais, ordenados por prioridade) quanto embutidos, somente leitura, na ficha da campanha/oferta correspondente (`tipoAlvo`/`alvoId`).

#### Scenario: Item aparece na ficha da campanha
- **WHEN** existe um `ItemFila` `ABERTO` com `tipoAlvo=CAMPANHA` e `alvoId` de uma campanha
- **THEN** a ficha daquela campanha exibe o item, mesmo sem o operador abrir a tela de fila
