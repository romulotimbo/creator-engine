# offer-review-queue Specification

## Purpose
TBD - created by archiving change offer-governance-features. Update Purpose after archive.
## Requirements
### Requirement: nextReviewAt field on OfertaDecisao
`OfertaDecisao` SHALL ter um campo `nextReviewAt` (DateTime, nullable, ISO 8601) que indica a data em que a oferta deve ser revisada.

#### Scenario: Set review date
- **WHEN** o operador define `nextReviewAt = "2026-09-01"` em uma oferta
- **THEN** o campo é persistido e a oferta passa a ser candidata à fila de revisão após essa data

#### Scenario: Offer without review date
- **WHEN** `nextReviewAt` é `null` em uma oferta com `approvalStatus != "pending"`
- **THEN** `isReviewDue` retorna `false` para essa oferta

### Requirement: isReviewDue function
A função utilitária `isReviewDue(offer, today)` SHALL determinar se uma oferta precisa de revisão segundo a lógica:
1. Se `offer.approvalStatus === "pending"` → retorna `true`
2. Se `offer.nextReviewAt` é `null` → retorna `false`
3. Se `offer.nextReviewAt <= today` → retorna `true`
4. Caso contrário → retorna `false`

#### Scenario: Pending approval triggers review
- **WHEN** `offer.approvalStatus === "pending"` e `today = "2026-08-05"`
- **THEN** `isReviewDue(offer, today)` retorna `true`, independente de `nextReviewAt`

#### Scenario: Past due review date triggers review
- **WHEN** `offer.nextReviewAt = "2026-07-01"` e `today = "2026-08-05"` e `approvalStatus != "pending"`
- **THEN** `isReviewDue(offer, today)` retorna `true`

#### Scenario: Future review date does not trigger review
- **WHEN** `offer.nextReviewAt = "2026-12-01"` e `today = "2026-08-05"` e `approvalStatus != "pending"`
- **THEN** `isReviewDue(offer, today)` retorna `false`

#### Scenario: Same-day review date triggers review
- **WHEN** `offer.nextReviewAt = "2026-08-05"` e `today = "2026-08-05"`
- **THEN** `isReviewDue(offer, today)` retorna `true` (condição `<=`)

### Requirement: "Precisa de revisão" view/filter in Radar UI
O módulo Radar SHALL exibir uma view ou filtro dedicado "Precisa de revisão" que lista todas as ofertas onde `isReviewDue(offer, today) === true`, independente do `scoreCalculado`.

#### Scenario: Filter shows due offers
- **WHEN** o operador seleciona o filtro "Precisa de revisão"
- **THEN** apenas ofertas onde `isReviewDue` retorna `true` são exibidas

#### Scenario: Due offers visually highlighted
- **WHEN** uma oferta aparece na listagem geral do Radar e `isReviewDue` retorna `true`
- **THEN** a oferta é destacada visualmente (badge, cor de linha ou ícone) indicando que precisa de revisão

#### Scenario: High-score offer still appears in review queue
- **WHEN** uma oferta tem `scoreCalculado = 95` mas `nextReviewAt` está vencida
- **THEN** ela aparece na view "Precisa de revisão" — o score não exclui a oferta da fila de revisão

### Requirement: Daily routine compatibility (isReviewDue)
A lógica `isReviewDue` SHALL ser invocável em um job/cron diário para identificar e notificar (ou logar) ofertas que entraram na fila de revisão naquele dia.

#### Scenario: Cron identifies newly due offers
- **WHEN** o cron é executado em `today = "2026-08-05"`
- **THEN** o job consulta `OfertaDecisao WHERE (approvalStatus = 'PENDING') OR (nextReviewAt IS NOT NULL AND nextReviewAt <= '2026-08-05')` e processa as ofertas retornadas

