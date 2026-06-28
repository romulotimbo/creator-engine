## ADDED Requirements

### Requirement: Botão agendar no calendário global

A página `/calendario` SHALL exibir botão "Agendar post" que abre modal de agendamento.

#### Scenario: Abrir modal

- **WHEN** usuário logado clica em "Agendar post"
- **THEN** o sistema exibe modal com seleção de persona

### Requirement: Fluxo persona → plataforma → roteiro → data

O modal SHALL guiar o usuário na ordem: persona, conta/plataforma, roteiro (post) e data/hora de publicação.

#### Scenario: Seleção em cascata

- **WHEN** usuário seleciona uma persona
- **THEN** o sistema lista apenas contas (`ContaPlataforma`) dessa persona

#### Scenario: Listar roteiros elegíveis

- **WHEN** usuário seleciona persona (e opcionalmente conta)
- **THEN** o sistema lista posts sem `dataPublicacao` com status `PENDENTE` ou `APROVADO` da persona

#### Scenario: Agendamento completo

- **WHEN** usuário confirma com persona, conta, post e data válidos
- **THEN** o sistema atualiza o post com `contaId`, `dataPublicacao` e status `AGENDADO`

### Requirement: Bloqueio RN-04 para persona banida

O sistema SHALL impedir agendamento quando a persona está com status `BANIDA`.

#### Scenario: Persona banida

- **WHEN** usuário tenta agendar post de persona `BANIDA`
- **THEN** o sistema retorna erro e não persiste o agendamento

### Requirement: Lista atualizada após agendamento

Após agendamento bem-sucedido, a tabela do calendário global SHALL incluir o post recém-agendado.

#### Scenario: Refresh da lista

- **WHEN** agendamento é confirmado com sucesso
- **THEN** o post aparece na tabela com data, persona, tipo, título e status AGENDADO

### Requirement: Filtros API para roteiros sem data

`GET /api/posts` SHALL aceitar `semData=true` e `contaId` como filtros opcionais.

#### Scenario: Buscar roteiros sem data

- **WHEN** cliente solicita `GET /api/posts?personaId={id}&semData=true`
- **THEN** o sistema retorna apenas posts da persona com `dataPublicacao` nulo

#### Scenario: Filtrar por conta

- **WHEN** cliente solicita `GET /api/posts?personaId={id}&contaId={id}`
- **THEN** o sistema retorna posts vinculados à conta informada

### Requirement: Estados vazios no modal

O modal SHALL informar quando não há contas ou roteiros disponíveis para a seleção atual.

#### Scenario: Persona sem contas

- **WHEN** persona selecionada não possui contas cadastradas
- **THEN** o sistema exibe mensagem orientando cadastrar contas no hub da persona

#### Scenario: Sem roteiros disponíveis

- **WHEN** persona não possui posts elegíveis para agendar
- **THEN** o sistema exibe mensagem e desabilita confirmação
