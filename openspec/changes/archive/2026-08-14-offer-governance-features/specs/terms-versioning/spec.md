## ADDED Requirements

### Requirement: TermsVersion entity
A entidade `TermsVersion` SHALL existir com os campos: `id`, `ofertaId` (FK para `OfertaDecisao`, Cascade), `verifiedAt` (DateTime), `termsUrl` (String, nullable), `changesSummary` (Text, nullable — descrição livre das mudanças percebidas), `capturedBy` (String, nullable — nome/email do operador), `createdAt`.

#### Scenario: TermsVersion created on perceived terms change
- **WHEN** o operador atualiza `OfertaDecisao.termsVerifiedAt` e indica que houve mudança percebida nos termos (`hasChanged = true` na request)
- **THEN** um novo `TermsVersion` é criado com `verifiedAt = now()` e `changesSummary` do request — o registro anterior NÃO é sobrescrito

#### Scenario: No TermsVersion created without change
- **WHEN** o operador atualiza `termsVerifiedAt` mas indica que não houve mudança (`hasChanged = false` ou omitido)
- **THEN** apenas `OfertaDecisao.termsVerifiedAt` é atualizado — nenhum `TermsVersion` é criado

#### Scenario: TermsVersion is append-only
- **WHEN** um `TermsVersion` é criado
- **THEN** ele NUNCA é atualizado ou deletado — apenas inserções são permitidas (sem endpoint de UPDATE/DELETE para `TermsVersion`)

### Requirement: Terms version history queryable per offer
O sistema SHALL prover um endpoint que retorna todos os `TermsVersion` de uma `OfertaDecisao`, ordenados por `verifiedAt` descrescente.

#### Scenario: Full audit trail per offer
- **WHEN** o operador consulta o histórico de termos da oferta `X`
- **THEN** todos os `TermsVersion` com `ofertaId = X` são retornados em ordem cronológica decrescente

#### Scenario: Empty history
- **WHEN** nenhuma mudança de termos foi registrada para uma oferta
- **THEN** a consulta retorna lista vazia (sem erro)

### Requirement: termsVerifiedAt field on OfertaDecisao
`OfertaDecisao` SHALL ter um campo `termsVerifiedAt` (DateTime, nullable) que indica quando os termos da oferta foram verificados pela última vez.

#### Scenario: Field updated on verification
- **WHEN** o operador registra uma verificação de termos
- **THEN** `termsVerifiedAt` é atualizado para `now()` independente de ter havido mudança nos termos ou não
