## ADDED Requirements

### Requirement: Links de LP e checkout aceitam URLs longas
`linkLanding` e `linkCheckout` de `ProdutoAfiliado` SHALL aceitar strings de até 2048 caracteres (vazia persiste como `null`). O limite de 50 caracteres permanece exclusivo do `slug`. Create e update (modal do catálogo e API) SHALL persistir a URL completa.

#### Scenario: URL de checkout maior que 50 caracteres
- **WHEN** o operador grava `linkCheckout` com 80 ou mais caracteres na edição do produto
- **THEN** o sistema persiste a URL integral e a devolve no GET — sem truncar e sem erro de validação de tamanho

#### Scenario: URL de LP maior que 50 caracteres
- **WHEN** o operador grava `linkLanding` com 80 ou mais caracteres
- **THEN** o sistema persiste a URL integral

#### Scenario: Slug continua limitado a 50
- **WHEN** o operador envia `slug` com mais de 50 caracteres
- **THEN** o sistema rejeita com erro de validação (422)

### Requirement: Modal de produto sem import CSV
O modal de criar/editar produto no Catálogo SHALL NOT incluir controle de upload ou botão de importar CSV de campanhas. Criar campanha pelo nome no modal SHALL permanecer disponível. O endpoint de import CSV de campanhas SHALL permanecer disponível fora dessa UI.

#### Scenario: Edição sem importar CSV
- **WHEN** o operador abre Editar em um produto do catálogo
- **THEN** o modal não exibe input de arquivo CSV nem botão "Importar CSV"

## MODIFIED Requirements

### Requirement: Catálogo de ProdutoAfiliado
O sistema SHALL permitir cadastrar produtos/ofertas afiliadas com nome, slug único, plataforma afiliada (ex.: Braip, Monetizze), preço opcional, percentual de comissão opcional, links de checkout e LP (até 2048 caracteres cada) e status.

#### Scenario: Criar produto
- **WHEN** usuário autenticado cria um ProdutoAfiliado com dados válidos
- **THEN** o sistema persiste o produto no catálogo

#### Scenario: Slug de produto duplicado
- **WHEN** usuário tenta criar produto com slug já existente
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Editar produto
- **WHEN** usuário atualiza preço, comissão ou links de um produto
- **THEN** o sistema persiste as alterações e mantém os vínculos com ContaTrafego

#### Scenario: Editar links longos
- **WHEN** usuário atualiza `linkLanding` e `linkCheckout` com URLs de rastreio maiores que 50 caracteres
- **THEN** ambos os links são persistidos por completo
