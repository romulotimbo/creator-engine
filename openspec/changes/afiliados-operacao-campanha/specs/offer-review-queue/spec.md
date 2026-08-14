## ADDED Requirements

### Requirement: Coluna proxima_revisao na tabela do Radar
A tabela do Radar SHALL incluir a coluna `nextReviewAt` (`proxima_revisao`) na própria linha, independente do filtro “Precisa de revisão”. Quando `isReviewDue(offer, today) === true`, a célula (ou a linha) SHALL exibir badge/alerta de revisão vencida.

#### Scenario: Data futura visível na linha
- **WHEN** `nextReviewAt = 2026-09-01` e hoje é 2026-08-14
- **THEN** a coluna mostra a data e NÃO aplica o destaque de vencida

#### Scenario: Revisão vencida na linha sem usar o filtro
- **WHEN** `nextReviewAt = 2026-07-01` e hoje é 2026-08-14, e o filtro “Precisa de revisão” está desligado
- **THEN** a oferta continua na listagem geral e a linha/célula é destacada como revisão vencida

#### Scenario: Sem data de revisão
- **WHEN** `nextReviewAt` é `null` e a oferta não está pendente de aprovação
- **THEN** a coluna mostra estado vazio (em dash ou equivalente) sem badge de vencida
