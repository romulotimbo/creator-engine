# analytics-reports Specification

## Purpose
TBD - created by archiving change conclusao-creator-engine. Update Purpose after archive.
## Requirements
### Requirement: Heatmap de publicação
O sistema SHALL exibir heatmap na página `/analytics` mostrando densidade de posts PUBLICADOS por dia da semana e hora.

#### Scenario: Heatmap com dados
- **WHEN** existem posts com `dataPublicacao` e status PUBLICADO
- **THEN** o sistema renderiza grid com intensidade proporcional à contagem

#### Scenario: Heatmap sem dados
- **WHEN** não há posts publicados com data
- **THEN** o sistema exibe estado vazio com mensagem explicativa

### Requirement: Exportar relatório analytics em XLSX
O sistema SHALL permitir download de relatório analytics (ROI por persona, ranking pilares, alertas) em XLSX.

#### Scenario: Download XLSX
- **WHEN** usuário clica "Exportar XLSX" em analytics
- **THEN** o sistema gera arquivo Excel com abas de ROI, pilares e alertas

### Requirement: Exportar relatório analytics em PDF
O sistema SHALL permitir download de resumo analytics em PDF.

#### Scenario: Download PDF
- **WHEN** usuário clica "Exportar PDF" em analytics
- **THEN** o sistema gera PDF com gráficos/tabelas principais

### Requirement: Visibilidade de afiliados no Analytics
O sistema SHALL incluir no `/analytics` (ou seção dedicada acessível a partir dele) agregação mínima de comissões afiliadas provenientes de `VendaAfiliado`, distinta do eixo de seguidores/ROI por persona, para que o P&L de tráfego pago não fique invisível.

#### Scenario: Totais de comissão afiliada
- **WHEN** existem vendas com status APROVADA em ContaTrafego
- **THEN** o analytics exibe total de comissões afiliadas no período considerado (ex.: 30 dias ou mês corrente)

#### Scenario: Sem vendas afiliadas
- **WHEN** não há registros em `VendaAfiliado`
- **THEN** a seção de afiliados no analytics exibe estado vazio sem quebrar o restante do relatório de personas

### Requirement: Não misturar métricas de persona e tráfego
O sistema SHALL NÃO misturar seguidores/engajamento de `ContaPlataforma` com métricas de ContaTrafego nas mesmas séries de gráfico; eixos permanecem visualmente separados.

#### Scenario: Séries separadas
- **WHEN** usuário visualiza analytics global
- **THEN** gráficos de crescimento de seguidores por persona permanecem inalterados e totais afiliados aparecem em bloco/seção distinta
