## ADDED Requirements

### Requirement: Catálogo de ProdutoAfiliado
O sistema SHALL permitir cadastrar produtos/ofertas afiliadas com nome, slug único, plataforma afiliada (ex.: Braip, Monetizze), preço opcional, percentual de comissão opcional, links (checkout/LP) e status.

#### Scenario: Criar produto
- **WHEN** usuário autenticado cria um ProdutoAfiliado com dados válidos
- **THEN** o sistema persiste o produto no catálogo

#### Scenario: Slug de produto duplicado
- **WHEN** usuário tenta criar produto com slug já existente
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Editar produto
- **WHEN** usuário atualiza preço, comissão ou links de um produto
- **THEN** o sistema persiste as alterações e mantém os vínculos com ContaTrafego

### Requirement: Associação N:N ContaTrafego ↔ Produto
O sistema SHALL permitir associar o mesmo ProdutoAfiliado a uma ou mais ContaTrafego, e uma ContaTrafego a vários produtos, para cobrir testes de estratégia/mercado com contas distintas.

#### Scenario: Associar produto à conta de tráfego
- **WHEN** usuário associa um produto existente à ContaTrafego atual
- **THEN** o sistema cria o vínculo e o produto aparece na seção Produtos do hub

#### Scenario: Mesmo produto em duas contas
- **WHEN** o mesmo ProdutoAfiliado é associado às ContaTrafego A e B
- **THEN** ambas listam o produto sem duplicar o registro do catálogo

#### Scenario: Desassociar produto
- **WHEN** usuário remove o vínculo produto↔ContaTrafego
- **THEN** o produto deixa de aparecer no hub daquela conta e permanece no catálogo (salvo exclusão explícita do produto)

### Requirement: Campos de vínculo por conta
O sistema SHALL permitir metadados opcionais no vínculo ContaTrafego↔Produto (ex.: link de tracking específico da conta, flag ativo), sem alterar os dados canônicos do produto no catálogo.

#### Scenario: Link de tracking por conta
- **WHEN** usuário define link de tracking no vínculo de um produto a uma ContaTrafego
- **THEN** o sistema persiste o link no vínculo e NÃO sobrescreve o link canônico do produto

### Requirement: Listagem de produtos no hub
O sistema SHALL exibir, na seção Produtos do hub da ContaTrafego, apenas produtos associados àquela conta, com plataforma afiliada e status do vínculo.

#### Scenario: Hub sem produtos
- **WHEN** ContaTrafego não possui produtos associados
- **THEN** a seção exibe estado vazio com CTA para criar ou associar produto
