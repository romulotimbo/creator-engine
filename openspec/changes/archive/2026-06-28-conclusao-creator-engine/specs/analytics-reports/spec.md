## ADDED Requirements

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
