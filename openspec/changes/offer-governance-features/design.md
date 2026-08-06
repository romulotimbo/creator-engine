## Context

O módulo `afiliados-decisao-campanha` introduziu `OfertaDecisao`, `DecisionLogOferta` e o algoritmo de score. Seis dimensões de governança permaneceram fora do escopo inicial: confiabilidade da rede de pagamento, fila de revisão obrigatória, histórico de domínios, alocação de capital agregada, versionamento de termos e origem de descoberta da oferta. Estas dimensões foram documentadas em `docs/mapeamento-campos-decisao-campanha.md` (seções 5.1–5.7) e formam o presente conjunto de mudanças.

Stack atual: Next.js 14 (App Router), Prisma + PostgreSQL, TypeScript, Zod, React.

## Goals / Non-Goals

**Goals:**
- Criar tabelas `Network`, `DomainUsageLog`, `TermsVersion`, `PortfolioConfig` no Prisma.
- Adicionar campos `nextReviewAt`, `domainUsed`, `termsVerifiedAt`, `discoverySource`, `networkId` em `OfertaDecisao`.
- Implementar função `isReviewDue` e filtro "Precisa de revisão" no Radar.
- Implementar trigger de `DomainUsageLog` (fecha log anterior, abre novo) a cada mudança de `domainUsed`.
- Implementar append-only de `TermsVersion` a cada mudança percebida de termos.
- Implementar `getActiveCapitalAllocation()` consumindo `PortfolioConfig.totalAvailableCapital`.
- Exibir badge `Network.paymentReliabilityScore` na tela de oferta (informativo, fora do score).
- Garantir que `score`/`scoreBreakdown` sejam sempre recalculados a cada update relevante de `OfertaDecisao`, nunca editáveis diretamente, e clampados em [0, 100].

**Non-Goals:**
- Integração automática com APIs externas das redes (Mediascalers, ClickBank, BuyGoods) — alimentação de `paymentReliabilityScore` é manual ou via avaliações internas.
- Scraping de domínios ou verificação automática de reputação de domínio — `reputationStatus` é setado manualmente.
- Autenticação multi-usuário ou permissões por papel — segue o modelo atual do creator-engine (usuário único implícito).

## Decisions

### 1. `Network` como tabela de apoio separada de `OfertaDecisao`

**Decisão**: `Network` é uma entidade independente, com FK em `OfertaDecisao`.

**Razão**: Uma rede (ex: ClickBank, BuyGoods) tem propriedades estáveis compartilhadas entre múltiplas ofertas (`paymentReliabilityScore`, `prazosPagamento`). Duplicar na oferta criaria inconsistências. Alternativa considerada: campo enum de rede — rejeitada porque limita a adição de metadados ricos por rede sem migrações.

### 2. `paymentReliabilityScore` não entra no score da oferta

**Decisão**: Badge exibido na UI como informação de contexto, nunca passado para `calcularScoreOferta`.

**Razão**: Confiabilidade da rede não diz nada sobre a qualidade da oferta em si — é um risco operacional de recebimento, não um indicador de conversão. Misturar os dois distorceria o ranking de ofertas.

### 3. `isReviewDue` como função utilitária pura, executada em runtime

**Decisão**: Função TypeScript pura `isReviewDue(offer, today)` sem coluna derivada no banco.

**Razão**: Coluna booleana derivada (`needsReview`) exigiria job de atualização ou triggers complexos. Com a função pura no servidor, a view "Precisa de revisão" é gerada filtrando no `SELECT` com `WHERE nextReviewAt <= NOW() OR approvalStatus = 'PENDING'` (índice em `nextReviewAt`). Sem overhead de escrita extra.

### 4. `DomainUsageLog` com padrão de abertura/fechamento (bitemporal simples)

**Decisão**: A cada troca de `OfertaDecisao.domainUsed`, o serviço executa em transação: `UPDATE DomainUsageLog SET usedUntil = now WHERE ofertaId = X AND usedUntil IS NULL` + `INSERT DomainUsageLog (ofertaId, domain, usedFrom = now)`.

**Razão**: Padrão de log bitemporal simples (sem biblioteca temporal) — adequado ao volume esperado. Alternativa: histórico embutido em JSON no campo da oferta — rejeitada por ser não-consultável eficientemente.

### 5. `TermsVersion` como append-only — não substitui `termsVerifiedAt`

**Decisão**: `termsVerifiedAt` em `OfertaDecisao` continua sendo atualizado (indica última verificação); `TermsVersion` é criado apenas quando há mudança percebida nos termos (campo `hasChanged: true` na request).

**Razão**: `termsVerifiedAt` responde "quando foram verificados pela última vez"; `TermsVersion` responde "o que mudou e quando". São perguntas distintas — campos distintos.

### 6. `PortfolioConfig` como tabela singleton para `totalAvailableCapital`

**Decisão**: Tabela `PortfolioConfig` com `id = "default"` (upsert), contendo `totalAvailableCapital` e outros parâmetros globais do portfólio.

**Razão**: `totalAvailableCapital` é um valor de portfólio — não faz sentido por oferta. Alternativa: variável de ambiente — rejeitada porque precisa ser editável pela UI sem redeploy.

### 7. `scoreBreakdown` como campo JSON em `OfertaDecisao`

**Decisão**: Adicionar `scoreBreakdown Json?` ao modelo para armazenar detalhamento dos fatores do score (epcScore, refundScore, tendenciaScore, etc.).

**Razão**: Permite exibir transparência do score na UI sem recalcular no frontend. Recalculado automaticamente junto com `scoreCalculado` a cada update relevante.

### 8. Escala de percentuais e clamp

**Decisão**: Todos os percentuais (`refundPct`, `tendenciaTrafego*`, `bounceRate`, `ctr`, `cvr`, `realRoi`) usam escala 0–100. `scoreCalculado` é sempre clampado em `Math.max(0, Math.min(100, rawTotal))` — nunca negativo, nunca acima de 100.

**Razão**: Consistência com dados reais (ex: "8,85% de refund" = 8.85, não 0.0885). Clamp explícito evita bugs em casos-limite (oferta com todos os fatores negativos).

## Risks / Trade-offs

- **[Risco]** Múltiplas chamadas ao `DomainUsageLog` em paralelo podem gerar dois registros abertos para o mesmo domínio.
  → *Mitigação*: Operação em transação Prisma (`$transaction`) com lock implícito por `ofertaId`.

- **[Risco]** `paymentReliabilityScore` preenchido manualmente pode ficar desatualizado sem aviso.
  → *Mitigação*: Campo `reliabilityUpdatedAt` em `Network` exibido na UI como "última atualização" para o operador saber quando revisar.

- **[Risco]** Score recalculado a cada update pode ser lento se `OfertaDecisao` tiver muitos campos sendo editados em formulários com autoSave.
  → *Mitigação*: O recálculo é local (função pura, sem I/O adicional) — custo irrelevante. Recálculo acontece no handler da API, não no cliente.

- **[Trade-off]** `isReviewDue` filtrado em runtime vs coluna persistida — solução em runtime é mais simples mas requer que a query do Radar inclua o filtro explicitamente (não automático).
  → *Decisão mantida*: Simplicidade operacional supera a conveniência. Índice em `nextReviewAt` garante performance.

## Migration Plan

1. Adicionar modelos `Network`, `DomainUsageLog`, `TermsVersion`, `PortfolioConfig` ao `prisma/schema.prisma`.
2. Adicionar campos `nextReviewAt`, `domainUsed`, `termsVerifiedAt`, `discoverySource`, `networkId`, `scoreBreakdown` em `OfertaDecisao`.
3. Rodar `npx prisma migrate dev --name offer-governance-features`.
4. Criar/atualizar utilitários: `src/lib/afiliados/scoring.ts` (clamp, breakdown), `src/lib/afiliados/review.ts` (isReviewDue), `src/lib/afiliados/domain-log.ts`, `src/lib/afiliados/capital.ts`.
5. Criar endpoints de API: `Network` CRUD, `DomainUsageLog` query, `TermsVersion` append, `PortfolioConfig` upsert, capital allocation widget.
6. Atualizar endpoint de `OfertaDecisao` (upsert) para recalcular score + gravar breakdown + disparar DomainUsageLog/TermsVersion quando aplicável.
7. Atualizar componentes de UI: badge de rede no modal de oferta, filtro "Precisa de revisão" no RadarClient, widget de capital na página do módulo Afiliados.
8. Rollback: Os campos novos são nullable — sem dado legado afetado. Reverter a migração Prisma restaura o estado anterior.
