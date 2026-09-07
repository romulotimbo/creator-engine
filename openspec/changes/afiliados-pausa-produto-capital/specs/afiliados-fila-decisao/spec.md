## ADDED Requirements

### Requirement: Cascade de pausa do produto expira itens abertos
Quando o cascade de pausa/arquivo do produto transiciona uma `Campanha` para `PAUSADO`, o sistema SHALL marcar `EXPIRADO` todo `ItemFila` não-terminal (`ABERTO` ou `ADIADO`) com `tipoAlvo = CAMPANHA` e `alvoId` dessa campanha. Itens já terminais NÃO SHALL ser alterados. Pausar uma campanha isolada na ficha (sem pausar o produto) NÃO SHALL expirar itens de outras campanhas do mesmo produto.

#### Scenario: Pausar produto expira teto aberto
- **WHEN** existe `ItemFila` `ABERTO` `teste.tetoComissao` para a campanha e o operador pausa o produto
- **THEN** esse item fica `EXPIRADO` e some da fila ativa

#### Scenario: Item já aplicado permanece
- **WHEN** o item da campanha já está `APLICADO` e o operador pausa o produto
- **THEN** o status do item permanece `APLICADO`

#### Scenario: Pausar só a campanha na ficha
- **WHEN** o operador pausa uma campanha na ficha sem alterar `ProdutoAfiliado.status`
- **THEN** os `ItemFila` dessa campanha permanecem no ciclo de vida atual (o operador ainda pode confirmá-los ou a regra reavaliar); irmãs não são expiradas

#### Scenario: Reteste gera item novo depois de expirado
- **WHEN** a campanha volta a `TESTANDO` e a regra de teto dispara de novo após um item `EXPIRADO`
- **THEN** o sistema cria um novo `ItemFila` (dedup não bloqueia estado terminal)
