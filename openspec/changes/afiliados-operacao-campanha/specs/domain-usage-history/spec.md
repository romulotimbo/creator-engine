## ADDED Requirements

### Requirement: Domínios em uso no Catálogo com link ao histórico
A ficha operacional de `ProdutoAfiliado` SHALL exibir o(s) domínio(s) em uso (valor copiado/atual de `domainUsed` do produto e, se houver, `DomainUsageLog` da `OfertaDecisao` de origem) com link para a view de histórico/reputação já especificada em `domain-usage-history`.

#### Scenario: Produto com domínio
- **WHEN** o produto tem `domainUsed = "nothforge.com"` (copiado da Offer no Go! ou editado)
- **THEN** a ficha mostra o domínio como link para o histórico daquele domínio

#### Scenario: Produto sem domínio
- **WHEN** `domainUsed` é `null` e não há logs
- **THEN** a ficha mostra estado vazio, sem link quebrado

#### Scenario: Domínio flagged visível no catálogo
- **WHEN** o domínio em uso tem `reputationStatus = flagged` ou `burned` em `DomainUsageLog`
- **THEN** a ficha do produto destaca o risco (badge) além do link
