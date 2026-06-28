# metricas-persona Specification

## Purpose
TBD - created by archiving change metricas-persona. Update Purpose after archive.
## Requirements
### Requirement: Página de métricas por persona
O sistema SHALL expor `/personas/[slug]/metricas` protegida por autenticação, exibindo métricas de todas as contas da persona.

#### Scenario: Acesso autenticado
- **WHEN** usuário logado navega para `/personas/{slug}/metricas`
- **THEN** o sistema exibe cards por conta, gráfico de seguidores e tabela histórica

#### Scenario: Persona inexistente
- **WHEN** o slug não existe
- **THEN** o sistema retorna 404

### Requirement: Cards de resumo por conta
O sistema SHALL exibir por conta: plataforma, handle, seguidores atuais, progresso da meta (se definida) e variação desde o snapshot anterior registrado.

#### Scenario: Conta com histórico
- **WHEN** existem ao menos dois snapshots para a conta
- **THEN** o card exibe delta de seguidores em relação ao snapshot imediatamente anterior

#### Scenario: Conta sem histórico
- **WHEN** a conta não tem snapshots
- **THEN** o card exibe seguidores atuais e estado vazio para delta

### Requirement: Gráfico de série temporal
O sistema SHALL renderizar gráfico de linha com uma série por plataforma, filtrável por período (30 dias, 90 dias, 6 meses, todo o histórico).

#### Scenario: Dados no período
- **WHEN** existem snapshots no período selecionado
- **THEN** o gráfico exibe linhas por plataforma com pontos por data

#### Scenario: Sem dados
- **WHEN** não há snapshots
- **THEN** o gráfico exibe estado vazio com mensagem orientando registro

### Requirement: Tabela histórica com delta
O sistema SHALL listar snapshots ordenados por data decrescente, com colunas data, conta, seguidores, delta, engajamento e receita do dia; filtrável por conta.

#### Scenario: Delta entre snapshots
- **WHEN** a tabela exibe dois snapshots consecutivos da mesma conta
- **THEN** a coluna delta mostra a diferença de seguidores em relação ao snapshot anterior cronológico

### Requirement: Registrar métrica via modal
O sistema SHALL permitir registrar snapshot via modal com conta (obrigatório), data (default hoje), seguidores (obrigatório), engajamento, posts publicados e receita do dia (opcionais).

#### Scenario: Registro bem-sucedido
- **WHEN** usuário preenche conta e seguidores e salva
- **THEN** o sistema persiste `MetricaHistorica`, atualiza `seguidoresAtual` se for o snapshot mais recente, e atualiza a página

#### Scenario: Upsert no mesmo dia
- **WHEN** usuário registra métrica para conta e data que já possui snapshot
- **THEN** o sistema substitui o snapshot existente em vez de criar duplicata

### Requirement: Editar e excluir snapshot
O sistema SHALL permitir editar e excluir snapshots existentes via API autenticada, com ações refletidas na UI.

#### Scenario: Editar snapshot
- **WHEN** usuário edita seguidores de um snapshot via PUT
- **THEN** o sistema persiste a alteração e recalcula `seguidoresAtual` se necessário

#### Scenario: Excluir snapshot
- **WHEN** usuário exclui um snapshot
- **THEN** o sistema remove o registro e define `seguidoresAtual` como o seguidores do snapshot mais recente restante, ou zero se nenhum restar

### Requirement: API GET de métricas
O sistema SHALL expor `GET /api/metricas` com filtros `personaId`, `contaId`, `from` e `to`, retornando snapshots ordenados por data.

#### Scenario: Filtro por persona
- **WHEN** cliente solicita `GET /api/metricas?personaId={id}`
- **THEN** o sistema retorna snapshots de todas as contas da persona

### Requirement: Navegação a partir do hub
O sistema SHALL incluir link "Métricas" na barra de navegação do hub da persona.

#### Scenario: Navegação do hub
- **WHEN** usuário clica em "Métricas" no hub
- **THEN** o sistema navega para `/personas/{slug}/metricas`

