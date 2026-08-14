## ADDED Requirements

### Requirement: Campos de análise na OfertaDecisao ainda ausentes
`OfertaDecisao` SHALL persistir: `conversionPoint` (`SALE` | `VALID_CC_SUBMIT` | `LEAD` | `CALL`, nullable), `tipoProduto` (`NUTRACEUTICO_TRIAL` | `ECOM` | `INFOPRODUTO` | `SERVICO`, nullable), `ltvEstimadoRebill` (Decimal, nullable), `saturacaoAfiliados` (`BAIXA` | `MEDIA` | `ALTA` | `DESCONHECIDA`, nullable), `criterioPausa` e `criterioEscala` (texto, nullable). Esses campos SHALL aparecer no formulário de cadastro/edição da oferta.

#### Scenario: Salvar conversion point
- **WHEN** o operador define `conversionPoint = VALID_CC_SUBMIT` e `ltvEstimadoRebill = 180` em uma oferta
- **THEN** os valores são persistidos e retornados na API de detalhe e listagem

#### Scenario: Conversion point opcional
- **WHEN** uma oferta é salva sem `conversionPoint`
- **THEN** o campo fica `null` — sem erro

#### Scenario: Valor de enum inválido
- **WHEN** o operador envia `conversionPoint = "checkout"`
- **THEN** o sistema retorna erro de validação Zod

### Requirement: Tabela do Radar com colunas promovidas e toggle de visibilidade
A tabela do Radar SHALL expor, além das colunas atuais (Nome, Redes, Score, EPC, Comissão, Refund, Tendência 30d, CPC Ads, Status), as colunas: `completudeDados` (badge próprio, não embutido no Score), `vertical`, `geoPrioritario` com contagem de `geosPermitidos`, `volumeBuscaMensal`, `brandBiddingPermitido` (ícone), `nextReviewAt`, `diasDesdeCriacao` (idade a partir de `createdAt`), `saturacaoAfiliados`, `discoverySource`. O operador SHALL poder ligar/desligar colunas; a preferência persiste em `localStorage`. Completude, Score, Vertical, Geo, Volume, Brand bidding e Próxima revisão SHALL iniciar visíveis; Idade, Saturação e Origem SHALL iniciar ocultas.

#### Scenario: Completude como coluna própria
- **WHEN** uma oferta tem `completudeDados = PARCIAL`
- **THEN** a tabela mostra um badge dedicado de completude — o texto não fica só dentro da célula de Score

#### Scenario: Geo com contagem
- **WHEN** `geoPrioritario = "DE"` e `geosPermitidos = ["DE","FR","UK"]`
- **THEN** a célula de geo exibe o prioritário e a contagem `3` (ou equivalente visível sem abrir a ficha)

#### Scenario: Toggle oculta coluna
- **WHEN** o operador desliga a coluna `volumeBuscaMensal`
- **THEN** a coluna desaparece da tabela e a preferência sobrevive a um reload da página

#### Scenario: Volume baixo visível sem abrir ficha
- **WHEN** `volumeBuscaMensal = 120` e a coluna está visível
- **THEN** o valor aparece na linha da oferta

### Requirement: Filtros da tabela alinhados às colunas novas
A tabela do Radar SHALL permitir filtrar por `completudeDados`, `vertical` e combinação com os filtros já existentes de status/rede/revisão.

#### Scenario: Filtrar só dados incompletos
- **WHEN** o operador escolhe completude `INCOMPLETO`
- **THEN** apenas ofertas com `completudeDados = INCOMPLETO` permanecem visíveis

#### Scenario: Filtrar por vertical
- **WHEN** o operador escolhe vertical `"weight loss"`
- **THEN** apenas ofertas com essa vertical são listadas
