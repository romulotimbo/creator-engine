## ADDED Requirements

### Requirement: Lista de contas é a view inicial do módulo
Acessar o módulo Afiliados pela sidebar MUST abrir a lista de `ContaTrafego` em `/afiliados`, que continua sendo o hub de contas (CRUD, cards, link para `/afiliados/nova`). A aba correspondente no nav interno MUST ser a primeira à esquerda.

#### Scenario: Sidebar abre a lista
- **WHEN** o usuário autenticado clica em Afiliados na sidebar
- **THEN** o sistema exibe a lista de ContaTrafego em `/afiliados`

#### Scenario: Bookmark da raiz permanece contas
- **WHEN** o usuário abre diretamente `/afiliados`
- **THEN** o sistema exibe a lista de contas (comportamento atual da rota, sem redirect)
