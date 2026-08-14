## 1. Prisma Schema — Enums e campos na Offer/Produto

- [x] 1.1 Adicionar enums `ConversionPoint`, `TipoProdutoAfiliado`, `SaturacaoAfiliados`, `EstrategiaCampanha`, `StatusOperacional`, `PapelContaAds` em `prisma/schema.prisma`
- [x] 1.2 Adicionar em `OfertaDecisao`: `conversionPoint`, `tipoProduto`, `ltvEstimadoRebill`, `saturacaoAfiliados`, `criterioPausa`, `criterioEscala`
- [x] 1.3 Adicionar em `ProdutoAfiliado`: `conversionPoint`, `tipoProduto`, `ltvEstimadoRebill`, `scoreOrigem`, `comissaoValor`, `budgetTesteAlocado`, `cpaAlvoBreakeven`, `cpaAlvoManual`, `margemDesejadaPct`, `criterioPausa`, `criterioEscala`, `statusOperacional`, `dataInicioTeste`, `dataUltimaAtualizacaoDados`, `domainUsed`, `nextReviewAt`, `moeda`, rollups `gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`, `cpaReal`
- [x] 1.4 Adicionar model `Campanha` (FK `produtoId` Cascade, `contaTrafegoId` SetNull, unique informal por produto+nome normalizado tratado na API) com índices em `(produtoId)` e `(produtoId, nomeCampanhaGoogleAds)`
- [x] 1.5 Adicionar model `CampanhaSnapshot` com unique `(campanhaId, dataSnapshot)` e índice em `(campanhaId, dataSnapshot)`
- [x] 1.6 Adicionar model `OrcamentoPeriodo` com unique `periodo` (`YYYY-MM`)
- [x] 1.7 Relacionar `ProdutoAfiliado.campanhas` e `Campanha.snapshots`; `prisma generate` OK. `db push` local falhou (Postgres em `192.168.15.11:5433` inacessível nesta sessão) — rodar `npx prisma db push` quando o banco estiver no ar.

## 2. SQL de produção e seed de orçamento

- [x] 2.1 Criar `prisma/sql/13-campanha-orcamento.sql` idempotente (enums, tabelas, FKs, índices, colunas novas) — número 13 para seguir a sequência do repo (03 já existia)
- [x] 2.2 Seed: se `PortfolioConfig` tem capital e não existe `OrcamentoPeriodo` do mês corrente, criar a linha (script ou upsert na primeira leitura)

## 3. Validação Zod e tipos

- [x] 3.1 Estender schemas de `OfertaDecisao` em `src/lib/afiliados.ts` com os campos novos (enums)
- [x] 3.2 Estender schema de `ProdutoAfiliado` (campos operacionais; strip de rollups no parse de PUT)
- [x] 3.3 Criar `campanhaCreateSchema` / `campanhaUpdateSchema` e schema de linha de snapshot
- [x] 3.4 Criar `orcamentoPeriodoSchema` (periodo regex `^\d{4}-(0[1-9]|1[0-2])$`, percentuais 0–100)

## 4. Offer — API e formulário

- [x] 4.1 Persistir os campos novos no POST/PATCH de `/api/afiliados/radar` e no GET de listagem/detalhe
- [x] 4.2 Incluir os campos no `modal-oferta-form.tsx` (conversion point, tipo, LTV, saturação, critérios pausa/escala)
- [x] 4.3 No fluxo Go!, copiar herança Offer → Produto conforme spec `produtos-afiliados` (`scoreOrigem`, budget, conversion point, etc.) e setar `statusOperacional = TESTANDO`

## 5. Radar — colunas, toggle e filtros

- [x] 5.1 Separar `completudeDados` em coluna/badge próprio em `radar-tabela.tsx` (sair do texto da célula de Score)
- [x] 5.2 Adicionar colunas: vertical, geo+contagem, volume de buscas, ícone brand bidding, próxima revisão (com destaque `isReviewDue`), idade, saturação, origem
- [x] 5.3 Implementar toggle de visibilidade com defaults da spec e persistência em `localStorage` (`ce.radar.colunas`)
- [x] 5.4 Filtros de completude, vertical e `discoverySource` na tabela (além dos já existentes)

## 6. Campanha — API, rollup e import CSV

- [x] 6.1 CRUD ` /api/afiliados/produtos/[id]/campanhas` (list/create) e `/api/afiliados/campanhas/[id]` (get/patch/delete)
- [x] 6.2 Implementar `recomputeProdutoRollups(produtoId)` em `src/lib/afiliados/rollups.ts` (latest snapshot por campanha; ROI/CPA null-safe)
- [x] 6.3 Chamar recompute em toda escrita de snapshot e ao deletar campanha; endpoint `POST .../recompute` para reparo
- [x] 6.4 Parser + `POST /api/afiliados/produtos/[id]/campanhas/import-csv` (match case-insensitive no produto; stub se sem match; unique do dia substitui; relatório criado/atualizado/inválido)
- [x] 6.5 Auto-preencher `dataInicioTeste` do produto na primeira campanha se ainda null; atualizar `dataUltimaAtualizacaoDados` no recompute
- [x] 6.6 Helper `alertaOrcamentoEstourado` (gasto > budget e status `TESTANDO`) para produto e campanha

## 7. Orçamento de período e painel de capital

- [x] 7.1 API `GET/PUT /api/afiliados/orcamento` (período corrente, upsert `OrcamentoPeriodo`; rollover copiando capital/guardrails do mês anterior)
- [x] 7.2 Reescrever `getActiveCapitalAllocation()`: fonte produto TESTANDO/ESCALANDO; campos `totalSpent`, `pctConsumed`, `alerts`, `periodo`; ofertas sem produto fora da soma
- [x] 7.3 Guardrails na API de budget do produto: `limitePctPorProduto` e `reservaMinimaPct` (422)
- [x] 7.4 Estender `ModalPortfolioConfig` (ou substituir) para capital, moeda, período, teto % e reserva
- [x] 7.5 Atualizar `CapitalAllocationWidget`: capital, alocado, gasto, livre, % consumido, lista por produto, alertas de estouro

## 8. Catálogo operacional — API e UI

- [x] 8.1 GET de produtos incluir herança, rollups, `statusOperacional`, datas, campanhas agregadas (conta/geo/papel/status), `alertaOrcamentoEstourado`, domínio+reputação
- [x] 8.2 PUT de produto aceitar campos operacionais; strip de rollups; recálculo de `cpaAlvoBreakeven` se `cpaAlvoManual = false`
- [x] 8.3 UI do Catálogo: ficha com os 4 grupos da spec (herdado, operacional, financeiro, governança); link clicável da oferta origem
- [x] 8.4 Sub-lista de contas/campanhas (não só `_count.contas`) + CRUD/import CSV na ficha
- [x] 8.5 Link de domínio para histórico + badge se flagged/burned
- [x] 8.6 Status comercial e operacional visíveis lado a lado

## 9. Testes

- [x] 9.1 Testes de `recomputeProdutoRollups` (duas campanhas, snapshot antigo ignorado, produto sem campanha → null)
- [x] 9.2 Testes de import CSV (match, stub, isolamento entre produtos, reimport do mesmo dia)
- [x] 9.3 Testes de `getActiveCapitalAllocation` (soma produto, exclui oferta sem produto, spent, alerta TESTANDO vs ESCALANDO)
- [x] 9.4 Testes de guardrails de orçamento e rollover de período
- [x] 9.5 Testes de herança Go! (`scoreOrigem` congelado) e strip de rollup no PUT
- [x] 9.6 Atualizar testes existentes de `capital.ts` que ainda somam `OfertaDecisao.budgetTesteAlocado`

## 10. Verificação

- [x] 10.1 `npx prisma generate` e types OK nos arquivos novos
- [x] 10.2 `npm test` passando (incluir os novos)
- [ ] 10.3 Smoke manual: configurar orçamento do mês → widget sai de $0; Go! herda conversion point; import CSV reflete gasto/ROI no catálogo; coluna de revisão vencida na tabela sem abrir ficha (pendente: banco local fora do ar)
