# produtos-afiliados Specification

## Purpose
Catálogo de produtos/ofertas afiliadas (ProdutoAfiliado) com associação N:N a contas de tráfego, suporte a metadados de vínculo (tracking, ativo) e listagem isolada por hub.
## Requirements
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

