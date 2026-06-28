# plano-ataque-crud Specification

## Purpose
TBD - created by archiving change plano-ataque-crud. Update Purpose after archive.
## Requirements
### Requirement: Criar item do plano de ataque

O sistema SHALL permitir criar um novo `PlanoAtaqueItem` com fase, título, descrição opcional e ordem.

#### Scenario: Criação bem-sucedida

- **WHEN** usuário logado envia `POST /api/plano-de-ataque` com `fase`, `titulo` e campos opcionais válidos
- **THEN** o sistema persiste o item e retorna status 201 com o objeto criado

#### Scenario: Validação falha

- **WHEN** usuário envia `POST` sem título ou fase
- **THEN** o sistema retorna status 422 com erro de validação

### Requirement: Editar item do plano de ataque

O sistema SHALL permitir editar fase, título, descrição e ordem de um item existente.

#### Scenario: Edição bem-sucedida

- **WHEN** usuário logado envia `PUT /api/plano-de-ataque/{id}` com campos válidos
- **THEN** o sistema atualiza o item e retorna o objeto atualizado

#### Scenario: Item inexistente

- **WHEN** usuário envia `PUT` para id inexistente
- **THEN** o sistema retorna status 404

### Requirement: Excluir item do plano de ataque

O sistema SHALL permitir excluir permanentemente um item do checklist.

#### Scenario: Exclusão bem-sucedida

- **WHEN** usuário logado envia `DELETE /api/plano-de-ataque/{id}`
- **THEN** o sistema remove o item e retorna confirmação

#### Scenario: Confirmação na UI

- **WHEN** usuário clica em excluir na interface
- **THEN** o sistema exige confirmação antes de chamar a API

### Requirement: Toggle de conclusão preservado

O sistema SHALL manter a capacidade de alternar `concluido` via `PATCH /api/plano-de-ataque/{id}` sem abrir modal de edição.

#### Scenario: Marcar concluído

- **WHEN** usuário clica no checkbox de um item
- **THEN** o sistema alterna `concluido` e atualiza a barra de progresso

### Requirement: Interface CRUD na página do plano

A página `/plano-de-ataque` SHALL expor botão "Novo item", ações editar/excluir por linha e modal de criação/edição.

#### Scenario: Novo item via UI

- **WHEN** usuário clica em "Novo item" e preenche o modal
- **THEN** o item aparece na fase correta após refresh

#### Scenario: Fase nova digitada

- **WHEN** usuário digita nome de fase inexistente no modal
- **THEN** o sistema cria o item na nova seção de fase

