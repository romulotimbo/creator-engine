## ADDED Requirements

### Requirement: Pausa de produto cascateia campanhas ativas
Quando o operador grava `ProdutoAfiliado.status` como `PAUSADO` ou `ARQUIVADO`, o sistema SHALL, na mesma transação, transicionar toda `Campanha` daquele produto com `status` `TESTANDO` ou `ESCALANDO` para `PAUSADO` via o mecanismo canônico de mudança de status (grava `CampanhaStatusLog` com motivo indicando pausa/arquivo do produto). Campanhas já `ENCERRADO` ou `PAUSADO` NÃO SHALL ser alteradas. A pausa é registro operacional no Creator Engine — o sistema SHALL NOT escrever no Google Ads.

#### Scenario: Pausar produto com campanha testando
- **WHEN** o operador altera um produto `ATIVO` com uma campanha `TESTANDO` para `status = PAUSADO`
- **THEN** a campanha passa a `PAUSADO`, o log registra o motivo de pausa do produto, e o produto fica `PAUSADO`

#### Scenario: Campanha encerrada não é tocada
- **WHEN** o produto tem uma campanha `ENCERRADO` e outra `ESCALANDO` e o operador arquiva o produto
- **THEN** a `ESCALANDO` vira `PAUSADO` e a `ENCERRADO` permanece `ENCERRADO` com o `motivoEncerramento` intacto

#### Scenario: Reativar produto não religa campanhas
- **WHEN** o operador volta `ProdutoAfiliado.status` de `PAUSADO` para `ATIVO`
- **THEN** o produto fica `ATIVO` e as campanhas permanecem no status em que estavam (pausadas)

### Requirement: Campanha nova exige produto ATIVO
O sistema SHALL recusar criar `Campanha` (API e modal `+ Campanha`) quando `ProdutoAfiliado.status` não for `ATIVO`.

#### Scenario: Produto pausado recusa campanha nova
- **WHEN** o operador tenta criar campanha num produto `PAUSADO`
- **THEN** o sistema rejeita com erro de validação (422) e nenhuma campanha é criada

#### Scenario: Produto ativo com irmãs pausadas aceita campanha nova
- **WHEN** o produto está `ATIVO` e todas as campanhas existentes estão `PAUSADO` ou `ENCERRADO`
- **THEN** o sistema permite criar uma campanha nova em `TESTANDO`

## MODIFIED Requirements

### Requirement: Status de presença no catálogo, ortogonal ao estado de campanha
`ProdutoAfiliado.status` SHALL representar presença no catálogo (`ATIVO`|`PAUSADO`|`ARQUIVADO`), não fase de teste — o grão de decisão keep/kill vive em `Campanha.status` (`TESTANDO`|`ESCALANDO`|`PAUSADO`|`ENCERRADO`). Pausar ou encerrar uma campanha NÃO SHALL alterar `ProdutoAfiliado.status`. A seta inversa (pausa/arquivo do produto ⇒ campanhas ativas pausadas) é o requisito “Pausa de produto cascateia campanhas ativas”. `ProdutoAfiliado.statusOperacional` permanece deprecated, sem drop de coluna, e NÃO SHALL alimentar leitura de capital, alerta ou viabilidade.

#### Scenario: Produto ativo com campanha pausada
- **WHEN** um `ProdutoAfiliado` está `ATIVO` no catálogo e uma de suas campanhas está `PAUSADO`
- **THEN** o produto continua listado como `ATIVO`; pausar uma campanha não altera `ProdutoAfiliado.status`

#### Scenario: Produto com múltiplas campanhas em fases diferentes
- **WHEN** um produto tem uma campanha `TESTANDO` e outra `ESCALANDO`
- **THEN** `ProdutoAfiliado.status` permanece `ATIVO`, refletindo só a presença no catálogo — as duas campanhas mantêm seus próprios estados
