## ADDED Requirements

### Requirement: Limiar global por chave
O sistema SHALL manter uma tabela genérica `LimiarGlobal` (chave string única, valor JSON), servindo como fonte única de constantes usadas por regras de decisão — piso de volume de busca, magnitude de variação, teto de teste, alertas de segmento, toggle de upload offline, entre outras. Nenhuma regra SHALL hardcodar esses valores no código.

#### Scenario: Regra lê limiar global
- **WHEN** uma regra de decisão precisa do piso de volume de busca
- **THEN** o sistema lê `LimiarGlobal` pela chave correspondente (ex.: `radar.pisoVolumeBuscaMensal`) em vez de uma constante no código

#### Scenario: Chave inexistente
- **WHEN** uma regra pede uma chave de `LimiarGlobal` que não foi semeada
- **THEN** o sistema usa um default documentado no código da regra e não falha

### Requirement: Override por produto
O sistema SHALL permitir que `ProdutoAfiliado.limiaresOverride` (JSON) sobrescreva, por chave, o valor de `LimiarGlobal` apenas para aquele produto. Quando uma chave não estiver presente no override do produto, o sistema SHALL usar o valor global.

#### Scenario: Produto com override
- **WHEN** `ProdutoAfiliado.limiaresOverride` contém `{"teste.pisoVolumeBuscaMensal": 500}` e o global é `300`
- **THEN** a regra usa `500` para aquele produto e `300` para os demais

#### Scenario: Produto sem override
- **WHEN** `ProdutoAfiliado.limiaresOverride` é `null` ou não contém a chave
- **THEN** a regra usa o valor de `LimiarGlobal` para aquele produto
