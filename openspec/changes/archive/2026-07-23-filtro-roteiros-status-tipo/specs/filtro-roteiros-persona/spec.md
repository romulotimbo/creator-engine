# filtro-roteiros-persona Specification

## Purpose

Filtros de status e tipo na listagem de roteiros por persona, melhorando navegação operacional em personas com muitos posts.

## ADDED Requirements

### Requirement: Barra de filtros na listagem de roteiros

A página `/personas/[slug]/roteiros` SHALL exibir controles de filtro por **status** (`StatusPost`) e **tipo** (`TipoPost`) acima da tabela de roteiros.

#### Scenario: Exibir filtros com opção "Todos"

- **WHEN** usuário logado acessa a página de roteiros de uma persona
- **THEN** o sistema exibe dois selects com primeira opção vazia rotulada "Todos os status" e "Todos os tipos", seguidas dos valores de `POST_STATUS_LABELS` e `TIPO_POST_LABELS`

#### Scenario: Filtrar por status

- **WHEN** usuário seleciona status `APROVADO` e deixa tipo em "Todos"
- **THEN** a tabela exibe apenas posts com `status = APROVADO`

#### Scenario: Filtrar por tipo

- **WHEN** usuário seleciona tipo `REEL` e deixa status em "Todos"
- **THEN** a tabela exibe apenas posts com `tipo = REEL`

#### Scenario: Combinar filtros (AND)

- **WHEN** usuário seleciona status `PENDENTE` e tipo `IMAGEM`
- **THEN** a tabela exibe apenas posts que satisfazem ambas as condições

### Requirement: Contador e estado vazio com filtros ativos

O sistema SHALL indicar quantos roteiros estão visíveis em relação ao total da persona quando pelo menos um filtro estiver ativo.

#### Scenario: Contador com filtro ativo

- **WHEN** persona possui 521 roteiros e filtro retorna 42
- **THEN** a UI exibe indicação do tipo "Mostrando 42 de 521" (ou equivalente visível na barra de filtros)

#### Scenario: Nenhum resultado para o filtro

- **WHEN** combinação de filtros não retorna posts
- **THEN** a tabela exibe mensagem "Nenhum roteiro corresponde aos filtros" (distinta de "Nenhum roteiro cadastrado")

### Requirement: Filtros na URL

O sistema SHALL persistir filtros ativos na query string da URL sem recarregar dados do servidor.

#### Scenario: URL reflete filtros

- **WHEN** usuário seleciona `status=APROVADO` e `tipo=REEL`
- **THEN** a URL atualiza para incluir `?status=APROVADO&tipo=REEL` via navegação shallow

#### Scenario: Carregar página com filtros na URL

- **WHEN** usuário acessa `/personas/{slug}/roteiros?status=PENDENTE`
- **THEN** o select de status inicia em `PENDENTE` e a tabela já aparece filtrada

### Requirement: Export respeita filtros ativos

O link de exportação XLSX na página de roteiros SHALL incluir os parâmetros `status` e `tipo` correspondentes aos filtros ativos.

#### Scenario: Export com filtro de status

- **WHEN** usuário filtra por `status=PUBLICADO` e clica em Exportar XLSX
- **THEN** o arquivo gerado contém apenas posts com status PUBLICADO

#### Scenario: Export com filtro de tipo

- **WHEN** usuário filtra por `tipo=CARROSSEL` e clica em Exportar XLSX
- **THEN** o arquivo gerado contém apenas posts do tipo CARROSSEL

#### Scenario: Export sem filtros

- **WHEN** ambos os filtros estão em "Todos"
- **THEN** o export inclui todos os roteiros da persona (comportamento atual)
