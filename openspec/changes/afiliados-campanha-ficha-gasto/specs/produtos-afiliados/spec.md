## ADDED Requirements

### Requirement: Catálogo navega para a ficha da campanha
A listagem do Catálogo SHALL tratar cada campanha da sub-lista expandida como link para `/afiliados/campanhas/[id]`. Após criar campanha pelo `+ Campanha` no modal do produto, o sistema SHALL abrir a ficha da campanha criada. O catálogo permanece o índice; a consulta/edição detalhada e o registro de gasto vivem na ficha.

#### Scenario: Clique na linha expandida
- **WHEN** o operador expande um produto com campanhas e clica numa campanha
- **THEN** a aplicação navega para `/afiliados/campanhas/{id}` dessa campanha

#### Scenario: Create redireciona para a ficha
- **WHEN** o operador cria uma campanha com nome Ads e geo no modal do produto
- **THEN** o sistema persiste a `Campanha` e navega para a ficha correspondente

#### Scenario: Produto sem campanhas
- **WHEN** o produto não tem campanhas
- **THEN** o expand continua mostrando estado vazio com CTA para criar no Editar; não há ficha órfã
