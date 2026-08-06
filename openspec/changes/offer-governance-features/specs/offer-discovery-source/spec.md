## ADDED Requirements

### Requirement: discoverySource field on OfertaDecisao
`OfertaDecisao` SHALL ter um campo `discoverySource` (String, nullable, enum-like) que registra a origem da descoberta da oferta. Valores permitidos: `search_from`, `network_direct`, `glimpse`, `keyword_planner`, `indicacao`, `outro`.

#### Scenario: Set discovery source on creation
- **WHEN** o operador cria uma oferta informando `discoverySource = "network_direct"`
- **THEN** o valor é persistido no campo

#### Scenario: Discovery source is optional
- **WHEN** uma oferta é criada sem `discoverySource`
- **THEN** o campo fica `null` — sem erro, sem valor default forçado

#### Scenario: Field accepts only allowed values
- **WHEN** o operador tenta salvar `discoverySource = "instagram_dm"` (valor não mapeado)
- **THEN** o sistema retorna erro de validação Zod indicando que o valor não é permitido

#### Scenario: No business logic derived from discoverySource
- **WHEN** `discoverySource` é definido ou alterado
- **THEN** nenhuma outra ação é disparada — o campo é apenas uma tag para futuras agregações analíticas

### Requirement: discoverySource available for analytics aggregation
O campo `discoverySource` SHALL ser incluído nos responses da API de listagem e detalhe de `OfertaDecisao`, permitindo que consultas externas (dashboards, relatórios futuros) agreguem por origem.

#### Scenario: Field returned in list endpoint
- **WHEN** o operador consulta a listagem de ofertas via API
- **THEN** `discoverySource` é incluído no payload de cada oferta (como `null` se não definido)

#### Scenario: Future average score by source is feasible
- **WHEN** existe um conjunto de ofertas com `discoverySource = "search_from"` e scores variados
- **THEN** é possível calcular externamente `AVG(scoreCalculado) GROUP BY discoverySource` usando os dados do endpoint de listagem
