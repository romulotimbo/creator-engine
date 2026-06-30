# calendario-persona-drag-drop Specification

## Purpose

Calendário operacional por persona: grid mensal com bandeja lateral de roteiros sem data e reagendamento via drag-and-drop.

## Requirements

### Requirement: Layout grid mensal com bandeja lateral

A página `/personas/[slug]/calendario` SHALL exibir um grid mensal (7 colunas, semana iniciando segunda-feira) à esquerda e uma bandeja lateral fixa à direita listando roteiros sem `dataPublicacao`.

#### Scenario: Estrutura visual do calendário

- **WHEN** usuário logado acessa o calendário de uma persona com roteiros
- **THEN** o sistema exibe o mês corrente em grid com cabeçalhos Seg–Dom e bandeja "Sem data (N)" visível ao lado

#### Scenario: Bandeja vazia

- **WHEN** todos os roteiros da persona possuem `dataPublicacao`
- **THEN** a bandeja exibe mensagem indicando que tudo está agendado

### Requirement: Drag-and-drop para agendar roteiros

O sistema SHALL permitir arrastar roteiros da bandeja lateral para um dia do grid, persistindo `dataPublicacao` via API.

#### Scenario: Agendar roteiro sem data

- **WHEN** usuário arrasta um roteiro da bandeja para um dia do mês
- **THEN** o roteiro aparece na célula do dia, some da bandeja e `dataPublicacao` é salva no banco

#### Scenario: Remover data de roteiro agendado

- **WHEN** usuário arrasta um roteiro de um dia de volta para a bandeja lateral
- **THEN** o roteiro retorna à bandeja e `dataPublicacao` é definida como null no banco

#### Scenario: Reagendar entre dias

- **WHEN** usuário arrasta um roteiro de um dia para outro dia
- **THEN** o roteiro move-se para o novo dia mantendo horário anterior (default 12:00 se ausente)

#### Scenario: Falha na API

- **WHEN** o PUT `/api/posts/[id]` falha durante reagendamento
- **THEN** o sistema reverte o estado visual e informa o usuário

### Requirement: Navegação mensal

O calendário SHALL permitir navegar entre meses e retornar ao mês atual.

#### Scenario: Navegar meses

- **WHEN** usuário clica em anterior ou próximo
- **THEN** o grid atualiza para o mês correspondente

#### Scenario: Voltar para hoje

- **WHEN** usuário clica em "Hoje"
- **THEN** o grid exibe o mês da data atual

### Requirement: Indicadores visuais por status

Chips de roteiro no grid e na bandeja SHALL usar cor distinta por `StatusPost` (PENDENTE, APROVADO, AGENDADO, PUBLICADO, REJEITADO).

#### Scenario: Chip colorido

- **WHEN** roteiro com status APROVADO aparece no calendário
- **THEN** o chip exibe cor associada ao status APROVADO

### Requirement: Destaque de drop target

Durante drag-and-drop, a célula ou bandeja sob o cursor SHALL destacar visualmente (borda/background accent).

#### Scenario: Hover no dia

- **WHEN** usuário arrasta roteiro sobre um dia
- **THEN** a célula do dia exibe highlight de drop

#### Scenario: Hover na bandeja

- **WHEN** usuário arrasta roteiro agendado sobre a bandeja
- **THEN** a bandeja exibe highlight de drop

### Requirement: Smoke test automatizado

O pipeline de QA SHALL incluir teste que valida presença da bandeja e persistência de agendamento no calendário da persona seed.

#### Scenario: E2E calendário persona

- **WHEN** smoke E2E roda com persona `veesemfiltro`
- **THEN** a página de calendário exibe bandeja "Sem data" e agendamento via API reflete na UI após refresh
