## 1. Prisma Schema — Novas Entidades

- [x] 1.1 Adicionar model `Network` com campos: `id`, `nome` (unique), `paymentReliabilityScore` (Int?, 0–100), `reliabilityUpdatedAt` (DateTime?), `prazoPagamentoDias` (Int?), `notas` (Text?), `createdAt`, `updatedAt`
- [x] 1.2 Adicionar model `DomainUsageLog` com campos: `id`, `ofertaId` (FK OfertaDecisao, Cascade), `domain`, `usedFrom` (DateTime), `usedUntil` (DateTime?), `reputationStatus` (enum: `ok`/`flagged`/`burned`, default `ok`), `createdAt`; índice em `(ofertaId, usedUntil)`
- [x] 1.3 Adicionar model `TermsVersion` com campos: `id`, `ofertaId` (FK OfertaDecisao, Cascade), `verifiedAt` (DateTime), `termsUrl` (String?), `changesSummary` (Text?), `capturedBy` (String?), `createdAt`; índice em `(ofertaId, verifiedAt)`
- [x] 1.4 Adicionar model `PortfolioConfig` com campos: `id` (String, default `"default"`), `totalAvailableCapital` (Decimal), `currency` (String, default `"USD"`), `updatedAt`
- [x] 1.5 Adicionar enum `ReputationStatus` com valores `ok`, `flagged`, `burned`
- [x] 1.6 Adicionar campos em `OfertaDecisao`: `networkId` (String?, FK Network, SetNull), `nextReviewAt` (DateTime?), `domainUsed` (String?), `termsVerifiedAt` (DateTime?), `discoverySource` (String?), `scoreBreakdown` (Json?); adicionar índice em `nextReviewAt`
- [x] 1.7 ~~Rodar `npx prisma migrate dev`~~ — projeto não usa migrations formais (sem pasta `prisma/migrations`); aplicado via `prisma db push` (padrão já usado em todas as fases anteriores, confirmado com o usuário). Schema sincronizado sem erros no Postgres de dev.

## 2. Utilitários de Lógica de Negócio

- [x] 2.1 Atualizar `src/lib/afiliados/scoring.ts`: garantir clamp `Math.max(0, Math.min(100, rawTotal))`, adicionar retorno de `scoreBreakdown` (objeto com `epcScore`, `refundScore`, `tendenciaScore`, `comissaoScore`, `penalidade`), garantir escala 0–100 para todos os percentuais
- [x] 2.2 Criar `src/lib/afiliados/review.ts`: exportar função pura `isReviewDue(offer: { approvalStatus?: string | null; nextReviewAt?: Date | string | null }, today: string): boolean` conforme spec `offer-review-queue`
- [x] 2.3 Criar `src/lib/afiliados/domain-log.ts`: exportar função `recordDomainChange(tx: PrismaTransaction, ofertaId: string, newDomain: string | null | undefined)` que fecha log ativo e abre novo (transacional, sem duplicatas)
- [x] 2.4 Criar `src/lib/afiliados/capital.ts`: exportar `getActiveCapitalAllocation()` que lê `PortfolioConfig` e soma `budgetTesteAlocado` de ofertas `APROVADO_TESTE`/`EM_EXECUCAO`

## 3. Validação Zod

- [x] 3.1 Adicionar `discoverySourceEnum` em `src/lib/afiliados.ts` com valores permitidos: `search_from`, `network_direct`, `glimpse`, `keyword_planner`, `indicacao`, `outro`
- [x] 3.2 Atualizar `ofertaDecisaoCreateSchema` e `ofertaDecisaoUpdateSchema` com os novos campos: `networkId?`, `nextReviewAt?` (coerce date), `domainUsed?`, `termsVerifiedAt?` (coerce date), `discoverySource?` (enum)
- [x] 3.3 Criar `networkCreateSchema` e `networkUpdateSchema` em `src/lib/afiliados.ts`
- [x] 3.4 Criar `portfolioConfigSchema` para upsert de `PortfolioConfig`
- [x] 3.5 Criar `termsVersionCreateSchema` com campos `hasChanged`, `termsUrl?`, `changesSummary?`, `capturedBy?`

## 4. API Endpoints — Network

- [x] 4.1 Criar `src/app/api/afiliados/networks/route.ts` com `GET` (listagem) e `POST` (create)
- [x] 4.2 Criar `src/app/api/afiliados/networks/[id]/route.ts` com `GET`, `PATCH` (update, atualiza `reliabilityUpdatedAt` automaticamente ao mudar score), `DELETE`

## 5. API Endpoints — DomainUsageLog

- [x] 5.1 Criar `src/app/api/afiliados/domains/route.ts` com `GET` — aceita query param `?reputationStatus=flagged,burned` para retornar domínios problemáticos com oferta associada
- [x] 5.2 Criar `src/app/api/afiliados/domains/[logId]/route.ts` com `PATCH` — permite atualizar apenas `reputationStatus`

## 6. API Endpoints — TermsVersion

- [x] 6.1 Criar `src/app/api/afiliados/ofertas/[id]/terms/route.ts` com `GET` (histórico de versões por oferta, ordenado por `verifiedAt` desc) e `POST` (append — cria `TermsVersion` se `hasChanged = true`, sempre atualiza `oferta.termsVerifiedAt`)

## 7. API Endpoints — PortfolioConfig & Capital

- [x] 7.1 Criar `src/app/api/afiliados/portfolio-config/route.ts` com `GET` (retorna config atual) e `PUT` (upsert com `id = "default"`)
- [x] 7.2 Criar `src/app/api/afiliados/capital-allocation/route.ts` com `GET` — invoca `getActiveCapitalAllocation()` e retorna JSON completo

## 8. Atualizar Handler de OfertaDecisao

- [x] 8.1 Atualizar `src/app/api/afiliados/radar/route.ts` (POST/PUT): ao criar/atualizar oferta, recalcular `scoreCalculado` + `scoreBreakdown` via `calcularScoreOferta()`, strip de `scoreCalculado` direto no body (implícito — não faz parte do schema Zod, sempre descartado no `.parse()`); também propagado ao importador CSV (`csv-parser.ts` + `importar-csv/route.ts`) para consistência
- [x] 8.2 Integrar `recordDomainChange()` no handler de update de oferta — invocar em `$transaction` quando `domainUsed` mudar (e também na criação, quando já vem preenchido)
- [x] 8.3 Integrar update de `termsVerifiedAt` no handler — delegar a rota `/terms` para criação de `TermsVersion` (campo stripped do POST/PATCH de `/radar`)
- [x] 8.4 Garantir que `networkId` e `discoverySource` são aceitos e persistidos corretamente na criação e update

## 9. UI — Badge de Confiabilidade da Rede

- [x] 9.1 Criar componente `NetworkReliabilityBadge` em `src/components/afiliados/` — exibe score (0–100) e `reliabilityUpdatedAt`; exibe "Sem avaliação" se `null`
- [x] 9.2 Integrar `NetworkReliabilityBadge` no modal de oferta (`modal-oferta-form.tsx`) ao lado do campo/exibição da rede
- [x] 9.3 Criar select de `Network` no formulário de oferta (campo `networkId`) com loading das redes disponíveis via API

## 10. UI — Filtro "Precisa de Revisão" no Radar

- [x] 10.1 Atualizar `RadarClient.tsx` para incluir filtro/aba "Precisa de revisão" — filtra ofertas onde `isReviewDue(offer, today) === true` (implementado em `RadarTabela.tsx`, consumido por `RadarClient`)
- [x] 10.2 Adicionar destaque visual (badge de cor, ícone ⚠) nas linhas de ofertas com `isReviewDue = true` na tabela do Radar
- [x] 10.3 Adicionar campo `nextReviewAt` (date picker) no formulário de oferta

## 11. UI — Widget de Alocação de Capital

- [x] 11.1 Criar componente `CapitalAllocationWidget` em `src/components/afiliados/` — consome `GET /api/afiliados/capital-allocation` e exibe total disponível, alocado, livre e lista de alocações por oferta (o widget pré-existente de mesmo nome, com propósito distinto — estatísticas do Radar — foi renomeado para `RadarStatsWidget`)
- [x] 11.2 Integrar `CapitalAllocationWidget` na página do Radar (`/afiliados/radar`) em posição de destaque (topo ou sidebar da página)
- [x] 11.3 Criar tela ou modal de configuração de `totalAvailableCapital` (link a partir do widget) que faz `PUT /api/afiliados/portfolio-config`

## 12. UI — Aviso de Domínio Problemático

- [x] 12.1 No formulário de oferta, ao preencher `domainUsed`, fazer lookup em `GET /api/afiliados/domains?reputationStatus=flagged,burned` e exibir aviso visual se o domínio digitado tiver histórico negativo
- [x] 12.2 Criar view de domínios problemáticos (modal ou tab no Radar) que lista todos os `DomainUsageLog` com `reputationStatus IN (flagged, burned)`

## 13. UI — Histórico de Termos e Origem de Descoberta

- [x] 13.1 Adicionar campo `discoverySource` (select com os 6 valores mapeados) no formulário de oferta
- [x] 13.2 Adicionar seção de termos no detalhe/modal da oferta: campo `termsVerifiedAt`, botão "Registrar verificação de termos" que abre modal para indicar se houve mudança + `changesSummary`
- [x] 13.3 Exibir histórico de `TermsVersion` por oferta (lista accordion ou timeline) no detalhe da oferta

## 14. Verificação Final

- [x] 14.1 Testar `isReviewDue` com os 4 cenários da spec (pending, vencida, futura, mesmo dia) — `src/lib/afiliados/review.test.ts`
- [x] 14.2 Testar clamp do score: oferta com rawTotal negativo deve resultar em `scoreCalculado = 0` — `src/lib/afiliados/scoring.test.ts`
- [x] 14.3 Testar `DomainUsageLog`: mudança de domínio fecha log anterior e abre novo em transação — `src/lib/afiliados/domain-log.test.ts` (tx mockada)
- [x] 14.4 Testar `TermsVersion`: `hasChanged = true` cria registro; `hasChanged = false` não cria — extraído para `src/lib/afiliados/terms.ts` (`recordTermsVerification`) + `terms.test.ts`
- [x] 14.5 Testar `getActiveCapitalAllocation()`: só soma ofertas `APROVADO_TESTE`/`EM_EXECUCAO`; trata `null` como 0 — `src/lib/afiliados/capital.test.ts` (db mockado)
- [x] 14.6 Verificar que `paymentReliabilityScore` não influencia `scoreCalculado` da oferta — `scoring.test.ts`
- [x] 14.7 Testar validação Zod de `discoverySource` com valor inválido — deve retornar erro de validação — `src/lib/afiliados.test.ts`
