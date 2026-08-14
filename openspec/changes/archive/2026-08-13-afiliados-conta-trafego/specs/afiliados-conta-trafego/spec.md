## ADDED Requirements

### Requirement: Lista e CRUD de ContaTrafego
O sistema SHALL permitir listar, criar, editar e excluir contas de tráfego (hub do módulo Afiliados), identificadas por slug único, com nome, plataforma de anúncios, status e observações opcionais.

#### Scenario: Listar contas de tráfego
- **WHEN** usuário autenticado acessa `/afiliados`
- **THEN** o sistema exibe a lista de ContaTrafego com nome, slug, plataforma e status

#### Scenario: Criar conta de tráfego
- **WHEN** usuário envia dados válidos em `/afiliados/nova` (ou POST `/api/afiliados`)
- **THEN** o sistema persiste ContaTrafego com slug único e redireciona/abre o hub

#### Scenario: Slug duplicado
- **WHEN** usuário tenta criar ContaTrafego com slug já existente
- **THEN** o sistema rejeita com erro de validação (409 ou 422)

#### Scenario: Excluir conta de tráfego
- **WHEN** usuário exclui uma ContaTrafego
- **THEN** o sistema remove a conta e, em cascade, contas vinculadas, vínculos de produto, credenciais do escopo e vendas associadas (ou impede exclusão se política de retenção for configurada — default: cascade)

### Requirement: Hub por slug com seções
O sistema SHALL exibir hub em `/afiliados/[slug]` com visão geral (totais recentes) e navegação para seções Contas vinculadas, Produtos, Credenciais e Vendas — sem seções de roteiros/calendário/métricas de seguidores.

#### Scenario: Abrir hub
- **WHEN** usuário navega para `/afiliados/{slug}` de uma conta existente
- **THEN** o sistema renderiza overview com nome, status e links/seções do módulo

#### Scenario: Slug inexistente
- **WHEN** usuário acessa slug que não existe
- **THEN** o sistema responde 404

### Requirement: Contas vinculadas à ContaTrafego
O sistema SHALL permitir CRUD de contas vinculadas a uma ContaTrafego (ex.: Braip, Monetizze, e-mail, proxy, pixel), com tipo, identificador/handle, status e notas — análogo operacional às contas de plataforma de uma persona, porém com tipagem própria de afiliados/infra.

#### Scenario: Adicionar conta vinculada
- **WHEN** usuário cria conta vinculada no hub da ContaTrafego
- **THEN** o sistema persiste o registro associado a `contaTrafegoId`

#### Scenario: Listar contas vinculadas
- **WHEN** usuário abre a seção Contas do hub
- **THEN** o sistema lista apenas contas vinculadas daquela ContaTrafego

#### Scenario: Isolamento entre hubs
- **WHEN** usuário visualiza contas de ContaTrafego A
- **THEN** o sistema NÃO lista contas vinculadas de ContaTrafego B

### Requirement: Entrada na navegação
O sistema SHALL expor o módulo Afiliados na sidebar (ou navegação principal equivalente) com rota `/afiliados`, sem alterar o fluxo existente de Personas.

#### Scenario: Navegação sidebar
- **WHEN** usuário autenticado visualiza a sidebar
- **THEN** existe item que leva à lista de ContaTrafego em `/afiliados`
