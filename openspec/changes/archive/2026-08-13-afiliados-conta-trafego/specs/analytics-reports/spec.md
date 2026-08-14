## ADDED Requirements

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
