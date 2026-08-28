## ADDED Requirements

### Requirement: Status de presença no catálogo, ortogonal ao estado de campanha
`ProdutoAfiliado.status` SHALL representar presença no catálogo (`ATIVO`|`PAUSADO`|`ARQUIVADO`), não fase de teste — o grão de decisão keep/kill vive em `Campanha.status` (`TESTANDO`|`ESCALANDO`|`PAUSADO`|`ENCERRADO`), que é independente. `ProdutoAfiliado.statusOperacional` (campo antigo que misturava os dois conceitos) fica deprecated, sem drop de coluna.

#### Scenario: Produto ativo com campanha pausada
- **WHEN** um `ProdutoAfiliado` está `ATIVO` no catálogo e uma de suas campanhas está `PAUSADO`
- **THEN** o produto continua listado como `ATIVO`; pausar uma campanha não altera `ProdutoAfiliado.status`

#### Scenario: Produto com múltiplas campanhas em fases diferentes
- **WHEN** um produto tem uma campanha `TESTANDO` e outra `ESCALANDO`
- **THEN** `ProdutoAfiliado.status` permanece `ATIVO`, refletindo só a presença no catálogo — as duas campanhas mantêm seus próprios estados

### Requirement: Limiares de decisão editáveis por produto
O sistema SHALL permitir `ProdutoAfiliado.limiaresOverride` (JSON) para sobrescrever, por chave, os limiares globais de `LimiarGlobal` usados pelas regras de teste/escala/segmento daquele produto.

#### Scenario: Override de piso de comissão
- **WHEN** o operador define um override de `teste.pisoVolumeBuscaMensal` na ficha do produto
- **THEN** as regras daquele produto usam o valor do override em vez do global
