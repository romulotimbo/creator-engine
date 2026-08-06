## ADDED Requirements

### Requirement: DomainUsageLog entity
A entidade `DomainUsageLog` SHALL existir com os campos: `id`, `ofertaId` (FK para `OfertaDecisao`, Cascade), `domain` (String), `usedFrom` (DateTime), `usedUntil` (DateTime, nullable — `null` indica registro ativo), `reputationStatus` (enum: `ok`, `flagged`, `burned`, default `ok`), `createdAt`.

#### Scenario: Open log created when domain is first assigned
- **WHEN** `OfertaDecisao.domainUsed` é definido pela primeira vez (campo estava `null`)
- **THEN** um novo `DomainUsageLog` é criado com `domain = domainUsed`, `usedFrom = now()`, `usedUntil = null`

#### Scenario: Previous log closed and new log opened on domain change
- **WHEN** `OfertaDecisao.domainUsed` é alterado de `"domain-a.com"` para `"domain-b.com"`
- **THEN** o `DomainUsageLog` ativo com `domain = "domain-a.com"` tem `usedUntil` setado para `now()` E um novo log é criado com `domain = "domain-b.com"`, `usedFrom = now()`, `usedUntil = null` — ambas operações em uma única transação Prisma

#### Scenario: No duplicate open logs for same offer
- **WHEN** `domainUsed` é atualizado para o mesmo valor (sem mudança real)
- **THEN** nenhum novo log é criado e o log existente não é modificado

#### Scenario: Log persists after offer deletion is blocked or set to null
- **WHEN** `OfertaDecisao` tem `domainUsed` setado para `null`
- **THEN** o log ativo é fechado (`usedUntil = now()`) e nenhum novo log é aberto

### Requirement: OfertaDecisao.domainUsed field
`OfertaDecisao` SHALL ter um campo `domainUsed` (String, nullable) que indica o domínio/URL de hospedagem da campanha da oferta.

#### Scenario: Domain field is editable
- **WHEN** o operador atualiza `domainUsed` via formulário
- **THEN** o campo é persistido e o trigger de `DomainUsageLog` é disparado

### Requirement: Flagged/burned domain query view
O sistema SHALL prover uma consulta (API endpoint ou view no Radar) que retorna todos os `DomainUsageLog` com `reputationStatus IN ('flagged', 'burned')`, agrupados por `domain`, para evitar reuso de domínios problemáticos.

#### Scenario: Query returns flagged domains
- **WHEN** o operador acessa a view de domínios problemáticos
- **THEN** todos os registros com `reputationStatus = 'flagged'` ou `reputationStatus = 'burned'` são retornados, com o nome do `domain` e as ofertas associadas

#### Scenario: Warn on domain reuse
- **WHEN** o operador tenta cadastrar `domainUsed` com um valor que existe em algum `DomainUsageLog` com `reputationStatus IN ('flagged', 'burned')`
- **THEN** o formulário exibe um aviso visual ("⚠ Este domínio tem histórico de reputação negativa") — não bloqueia o save, apenas avisa

### Requirement: reputationStatus manually updatable
O campo `reputationStatus` de `DomainUsageLog` SHALL ser atualizável manualmente pelo operador.

#### Scenario: Mark domain as burned
- **WHEN** o operador marca um `DomainUsageLog` como `burned`
- **THEN** `reputationStatus` é atualizado para `burned` e futuros usos desse domínio exibem o aviso de reputação negativa
