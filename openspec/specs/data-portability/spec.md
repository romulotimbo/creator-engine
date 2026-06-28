# data-portability Specification

## Purpose
TBD - created by archiving change conclusao-creator-engine. Update Purpose after archive.
## Requirements
### Requirement: Exportar roteiros filtrados para XLSX
O sistema SHALL permitir exportar posts de uma persona para XLSX com colunas compatíveis com o import existente (A–R).

#### Scenario: Export com filtros
- **WHEN** usuário exporta roteiros de persona com filtro de status
- **THEN** o sistema gera XLSX contendo apenas posts que correspondem ao filtro

#### Scenario: Export vazio
- **WHEN** nenhum post corresponde ao filtro
- **THEN** o sistema gera XLSX com cabeçalhos e zero linhas de dados

### Requirement: Export JSON snapshot reimportável
O sistema SHALL permitir exportar snapshot JSON de dados principais (personas, posts, financeiro, ferramentas) via endpoint autenticado.

#### Scenario: Download snapshot
- **WHEN** usuário solicita export JSON completo
- **THEN** o sistema gera arquivo JSON estruturado com timestamp no nome

### Requirement: Import básico de vault Obsidian
O sistema SHALL aceitar upload de arquivo `.md` com frontmatter YAML e criar `DiscoveryEntry` ou nota conforme tipo mapeado.

#### Scenario: Import nota Obsidian
- **WHEN** usuário faz upload de `.md` com frontmatter `tipo: ideia`
- **THEN** o sistema cria `DiscoveryEntry` com campos mapeados do frontmatter e body como descrição

