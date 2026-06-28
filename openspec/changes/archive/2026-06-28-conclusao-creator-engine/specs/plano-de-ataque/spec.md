## ADDED Requirements

### Requirement: Plano de ataque acessível na aplicação
O sistema SHALL expor o checklist estratégico em `/plano-de-ataque`, protegido por autenticação, lendo dados de `creator_engine.creator_engine_state`.

#### Scenario: Usuário autenticado acessa plano de ataque
- **WHEN** usuário logado navega para `/plano-de-ataque`
- **THEN** o sistema exibe o checklist com itens e status atuais do banco

#### Scenario: Usuário não autenticado é redirecionado
- **WHEN** usuário não logado acessa `/plano-de-ataque`
- **THEN** o sistema redireciona para a tela de login

### Requirement: Modelo Prisma para creator_engine_state
O sistema SHALL modelar a tabela `creator_engine_state` no `schema.prisma` após introspection, sem alterar a tabela original em `public`.

#### Scenario: Prisma client acessa estado
- **WHEN** a aplicação consulta o plano de ataque via Prisma
- **THEN** os dados são lidos do schema `creator_engine` na tabela mapeada

### Requirement: Item do plano editável
O sistema SHALL permitir marcar itens do checklist como concluídos/pendentes via API autenticada.

#### Scenario: Toggle de item
- **WHEN** usuário marca um item como concluído
- **THEN** o sistema persiste a alteração em `creator_engine.creator_engine_state` e atualiza a UI

### Requirement: Link na sidebar
O sistema SHALL incluir "Plano de Ataque" na navegação principal da sidebar.

#### Scenario: Navegação via sidebar
- **WHEN** usuário clica em "Plano de Ataque" na sidebar
- **THEN** o sistema navega para `/plano-de-ataque`
