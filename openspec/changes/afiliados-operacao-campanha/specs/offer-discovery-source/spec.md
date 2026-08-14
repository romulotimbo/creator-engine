## ADDED Requirements

### Requirement: origem_descoberta como coluna e filtro no Radar
A tabela do Radar SHALL expor `discoverySource` como coluna (default oculta, ligável no toggle) e como filtro (“só o que veio do Planejador”, “indicação”, etc.), usando os valores já permitidos: `search_from`, `network_direct`, `glimpse`, `keyword_planner`, `indicacao`, `outro`.

#### Scenario: Filtrar por keyword_planner
- **WHEN** o operador seleciona origem `keyword_planner`
- **THEN** apenas ofertas com `discoverySource = "keyword_planner"` são listadas

#### Scenario: Coluna visível após toggle
- **WHEN** o operador liga a coluna Origem
- **THEN** cada linha exibe o rótulo da origem (ou vazio se `null`)

#### Scenario: Null não quebra o filtro “todas”
- **WHEN** o filtro de origem está em “todas”
- **THEN** ofertas com `discoverySource = null` continuam visíveis
