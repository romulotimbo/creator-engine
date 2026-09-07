## ADDED Requirements

### Requirement: Entrada ao comparativo de campanhas do produto
O catálogo SHALL oferecer, por produto que tenha ao menos uma campanha, navegação para o comparativo de vigentes das campanhas daquele produto. O comparativo NÃO SHALL incluir campanhas de outros produtos.

#### Scenario: Produto com duas campanhas
- **WHEN** o operador está no catálogo num produto com duas campanhas e abre o comparativo
- **THEN** a aplicação mostra as duas campanhas lado a lado com as vigentes alinhadas

#### Scenario: Produto sem campanha
- **WHEN** o produto não tem campanhas
- **THEN** o catálogo não oferece comparativo (ou o oferece desabilitado); não há tela órfã
