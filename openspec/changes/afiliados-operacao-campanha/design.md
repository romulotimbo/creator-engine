## Context

O módulo Afiliados já tem três camadas: **Radar** (`OfertaDecisao` + score + governança), **Catálogo** (`ProdutoAfiliado` comercial, N:N com `ContaTrafego`) e **painel de capital** (`PortfolioConfig` singleton + `getActiveCapitalAllocation()` somando `OfertaDecisao.budgetTesteAlocado`). A ficha da oferta captura vertical, geo, economics e leilão; a tabela do Radar (~1300 linhas) ainda mostra só Nome, Redes, Score, EPC, Comissão, Refund, Tendência 30d, CPC, Status. O Catálogo não herda `conversion_point`/budget/LTV na conversão Go!, não lista contas Ads (só `_count.contas`) e não tem gasto/receita/ROI. Não existe entidade de campanha: performance, se existir, seria no grão da oferta. `PortfolioConfig.totalAvailableCapital` pode ser preenchido, mas o widget continua conceitualmente zerado no lado realizado — não há gasto real nem orçamento por período.

Stakeholders: operador único (Rômulo) decidindo go/no-go e alocando capital de teste em Google Ads, geo a geo, com CSV importado manualmente.

Stack: Next.js App Router, Prisma 6 + PostgreSQL (`schema=creator_engine`), Zod, React client components no padrão já usado em `RadarTabela` / `CatalogoClient` / `CapitalAllocationWidget`.

## Goals / Non-Goals

**Goals:**
- Persistência e UI dos campos de decisão que ainda não existem na Offer (`conversionPoint`, `tipoProduto`, `ltvEstimadoRebill`, `saturacaoAfiliados`, `criterioPausa`, `criterioEscala`).
- Tabela do Radar como visão de “bater o olho”: colunas promovidas, toggle de visibilidade, filtros (completude, vertical, origem, revisão vencida).
- Catálogo como visão operacional do que está rodando: herança da Offer, contas detalhadas, datas, status operacional, rollups financeiros, governança editável no produto.
- Entidade `Campanha` 1:N com `ProdutoAfiliado` + `CampanhaSnapshot` append-only (CSV).
- Rollups no produto calculados no servidor, nunca editáveis na UI.
- Orçamento por período (capital, moeda, teto % por produto, reserva) e widget com planejado vs realizado + alerta de estouro.

**Non-Goals:**
- Integração automática com Google Ads API (CSV manual continua sendo a fonte).
- Conversão cambial automática USD↔BRL (sem API de FX). Moeda base é de exibição; mismatch vira aviso, não conversão.
- Paginação server-side do Radar (1300 linhas já cabem no cliente; fora desta change).
- Recalcular `scoreCalculado` da Offer a partir de ROI real da campanha.
- Publicação automática / n8n a partir de campanha.
- Multi-usuário ou permissões por papel.
- Histórico longo de orçamentos fechados além do período corrente + o imediatamente anterior (arquivo fino, não data warehouse).

## Decisions

### 1. Campanha pertence ao Produto, não à Offer

**Decisão**: `Campanha.produtoId` → `ProdutoAfiliado`. `OfertaDecisao` permanece o estágio de análise; depois do Go! o dinheiro vive no produto.

**Razão**: A Offer pode gerar zero ou um produto; o produto é o que gasta. Granularidade geo/conta/estratégia só faz sentido onde há Ads rodando. Alternativa (FK na Offer) misturaria garimpo com operação e quebraria o fluxo já especificado de migração Go!.

### 2. Snapshot é cumulativo até a data; rollup usa o mais recente por campanha

**Decisão**: Cada `CampanhaSnapshot.gasto` / `receitaConfirmada` representa o acumulado da campanha **até** `dataSnapshot` (o que o CSV do Ads normalmente traz no intervalo “desde o início” ou no export escolhido pelo operador). Rollup do produto:

```
gasto_total_acumulado     = Σ latestSnapshot(c).gasto          ∀ campanhas do produto
receita_confirmada_acum.  = Σ latestSnapshot(c).receitaConfirmada
roi_real                  = (receita − gasto) / gasto          se gasto > 0; senão null
cpa_real                  = gasto / conversões                 se conversões > 0; senão null
percentual_budget_consumido = gasto / budgetTesteAlocado       se budget > 0; senão null
```

Não se soma o histórico inteiro (duplicaria gasto se o CSV for cumulativo).

**Razão**: Import manual tende a ser “relatório até hoje”, não delta diário. Alternativa (delta) exigiria disciplina que o CSV atual não garante.

**Persistência**: colunas denormalizadas em `ProdutoAfiliado` (`gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`, `cpaReal`, `dataUltimaAtualizacaoDados`), recalculadas em `recomputeProdutoRollups(produtoId)` na mesma transação do import. Catálogo lista dezenas de produtos sem N+1 em snapshots.

### 3. Import CSV é append-only e escopado a um produto

**Decisão**: `POST /api/afiliados/produtos/[id]/campanhas/import-csv` recebe o arquivo + `dataSnapshot` (default = hoje). Matching por `nomeCampanhaGoogleAds` (normalizado trim/case-insensitive) **dentro daquele produto**:
- match → novo `CampanhaSnapshot` na campanha existente; atualiza `Campanha.dataUltimaAtualizacao`;
- sem match → cria `Campanha` (status `TESTANDO`, geo/estratégia nulos até o operador completar) + primeiro snapshot;
- relatório de import lista criadas / atualizadas / linhas inválidas.

Nunca faz upsert no snapshot do mesmo dia: se reimportar a mesma data, substitui **somente** o snapshot com aquele `campanhaId + dataSnapshot` (unique), para corrigir CSV errado sem duplicar o dia.

**Razão**: Escopo por produto evita cruzar Purotyn com LipoBliss quando o Ads usa nomes parecidos. Unique `(campanhaId, dataSnapshot)` permite correção sem virar timeseries lixo.

### 4. Contas Ads no catálogo = projeção das campanhas

**Decisão**: Não criar tabela `ProdutoContaAds`. A sub-lista “conta, geo, status, papel (principal/contingência)” é agregada das `Campanha` do produto. `Campanha` tem `contaTrafegoId` (FK opcional ao hub) + `nomeContaAds` (string como no Google Ads) + `papelConta` (`PRINCIPAL` | `CONTINGENCIA`). `ContaTrafegoProduto` continua sendo o vínculo do hub (tracking/ativo) — não é a lista operacional de contas Ads.

**Razão**: Uma oferta roda em várias contas por geo ou contingência; isso já é uma campanha. Duplicar o vínculo criaria dois lugares para atualizar. Alternativa (enriquecer `ContaTrafegoProduto` com geo) não cobre duas campanhas na mesma conta (review vs branded).

### 5. Status comercial ≠ status operacional

**Decisão**: `ProdutoAfiliado.status` (`ATIVO` | `PAUSADO` | `ARQUIVADO`) permanece “o produto existe no catálogo”. Novo `statusOperacional` (`TESTANDO` | `ESCALANDO` | `PAUSADO` | `ENCERRADO`) no produto **e** na campanha. Não é derivado automaticamente: o operador define. UI avisa se produto está `TESTANDO` com todas as campanhas `PAUSADO`/`ENCERRADO`.

**Razão**: Misturar “cadastrei o produto” com “a campanha está rodando” é o bug atual do catálogo. Derivação automática esconderia a decisão humana (pausar produto enquanto uma campanha de contingência ainda drena budget).

### 6. Herança Offer → Produto na conversão Go! (cópia, não view)

**Decisão**: No fluxo “Go! Criar Campanha” já existente, além de criar `ProdutoAfiliado` + `ContaTrafegoProduto`, copiar: `conversionPoint`, `vertical`/`tipoProduto`, `ltvEstimadoRebill`, `scoreCalculado` → `scoreOrigem` (somente leitura daí em diante), `budgetTesteAlocado`, `cpaAlvoBreakeven`, `criterioPausa`, `criterioEscala`, `nextReviewAt`, `domainUsed`. `ofertaDecisaoId` já existe. Depois da cópia, critérios de pausa/escala e budget no produto são independentes da Offer.

**Razão**: A realidade da campanha exige ajuste (CPA alvo mudou, critério de pausa mais rígido). View live da Offer reescreveria a operação. `scoreOrigem` é histórico (“por que escolhemos”) e não deve acompanhar o score se a Offer for re-scorada depois.

### 7. `conversionPoint` e campos do mapeamento vivem primeiro na Offer

**Decisão**: Novos campos em `OfertaDecisao` (fonte de verdade na análise). Produto recebe cópia + pode editar os operacionais. Enums:

| Campo | Valores |
|---|---|
| `ConversionPoint` | `SALE`, `VALID_CC_SUBMIT`, `LEAD`, `CALL` |
| `TipoProdutoAfiliado` | `NUTRACEUTICO_TRIAL`, `ECOM`, `INFOPRODUTO`, `SERVICO` |
| `SaturacaoAfiliados` | `BAIXA`, `MEDIA`, `ALTA`, `DESCONHECIDA` |
| `EstrategiaCampanha` | `REVIEW_BOTTOM_FUNNEL`, `GENERIC_TOP_FUNNEL`, `BRANDED_BIDDING` |
| `StatusOperacional` | `TESTANDO`, `ESCALANDO`, `PAUSADO`, `ENCERRADO` |
| `PapelContaAds` | `PRINCIPAL`, `CONTINGENCIA` |

**Razão**: Catálogo tratando “Valid CC Submit” igual a “Sale” é o gap nº 1. Sem o campo na Offer, a herança não tem de onde copiar.

### 8. Orçamento por período é `OrcamentoPeriodo`; `PortfolioConfig` vira moeda + ponte

**Decisão**: Nova tabela `OrcamentoPeriodo` com `periodo` unique (`YYYY-MM`), `capitalTotalDisponivel`, `moedaBase`, `limitePctPorProduto` (0–100, nullable), `reservaMinimaPct` (0–100, default 0). `getActiveCapitalAllocation()` lê o período corrente (mês civil UTC-3 / `America/Sao_Paulo`). Se não houver linha, capital = 0 (comportamento atual). `PortfolioConfig` permanece: `currency` é fallback de `moedaBase`; na primeira gravação de orçamento do mês, se `PortfolioConfig.totalAvailableCapital > 0` e não existe período, seed automático. Tela de configuração (já há `ModalPortfolioConfig`) edita o período corrente.

**Livre** = `capitalTotal − alocado` (não capital − gasto): livre é o que ainda pode ser **comprometido**. `% consumido` = `gastoRealizado / capitalTotal`.

**Alocado** = soma de `ProdutoAfiliado.budgetTesteAlocado` com `statusOperacional IN ('TESTANDO','ESCALANDO')`. Ofertas sem produto não entram.

**Guardrail**: ao salvar `budgetTesteAlocado` no produto, se `limitePctPorProduto` estiver setado e `budget > capital * limite/100`, a API rejeita (422). `reservaMinimaPct`: `alocado` não pode ultrapassar `capital * (1 − reserva/100)`.

**Razão**: Singleton sem período não distingue agosto de setembro. Tabela por mês é consultável e simples. Alternativa (só estender `PortfolioConfig`) perderia histórico no virar do mês.

### 9. Alerta de orçamento estourado é derivado, não uma coluna persistida

**Decisão**: `alertaOrcamentoEstourado` no payload do catálogo/widget quando:

`gastoTotalAcumulado > budgetTesteAlocado` (budget não-nulo, > 0)
AND `statusOperacional === 'TESTANDO'`
AND não existe `DecisionLogOferta` (se houver `ofertaDecisaoId`) **nem** mudança de `statusOperacional` do produto para `ESCALANDO`/`PAUSADO`/`ENCERRADO` depois do snapshot que cruzou o teto.

Na prática v1: a condição suficiente é **gasto > budget E status ainda TESTANDO**. Se o operador escalou ou pausou, a decisão está registrada no próprio status. Campanha individual: mesmo critério no grão da campanha (`gasto do latest snapshot > budgetTesteAlocado` da campanha e `status === TESTANDO`).

**Razão**: Coluna booleana persistida exigiria job. Status operacional já é o DecisionLog de pausa/escala no produto. Alternativa (`DecisionLogProduto` dedicado) fica para se o status se mostrar insuficiente.

### 10. Colunas do Radar: default visível vs toggle; persistência em `localStorage`

**Decisão**: `RadarTabela` ganha mapa de colunas. Defaults **ligados**: Nome, Redes, Completude (badge próprio), Score, Vertical, Geo (prioritário + `n` permitidos), Vol. buscas, EPC, Comissão, Refund, Tendência 30d, CPC Ads, Brand bidding (ícone), Próxima revisão, Status. Defaults **desligados**: Idade (dias desde `createdAt`), Saturação, Origem descoberta. Preferência por `localStorage` (`ce.radar.colunas`). Filtros server-agnostic no cliente (já é o padrão): completude, vertical, origem, `isReviewDue`.

**Razão**: 1300 linhas × 20 colunas deixa a tabela inutilizável. Backend de preferência de UI é overkill para operador único.

### 11. `cpaAlvoBreakeven` no produto é calculado e editável

**Decisão**: Se o operador informa `margemDesejadaPct` (default 100 = breakeven na comissão), `cpaAlvoBreakeven = comissaoValor / (margemDesejadaPct/100)` usando a comissão copiada da Offer (`ProdutoAfiliado` hoje tem `comissaoPercent` e `preco`, não comissão absoluta — **adicionar `comissaoValor`** na cópia Go!). Override manual de `cpaAlvoBreakeven` é permitido; nesse caso `cpaAlvoManual = true` e o recálculo não sobrescreve.

**Razão**: Preço de checkout subestima trial/rebill; LTV entra na leitura, não na fórmula de CPA alvo v1 (CPA alvo continua “comissao ÷ margem”). Misturar LTV na fórmula sem taxa trial→rebill mentiria o corte.

### 12. Datas de teste e de dados

**Decisão**:
- `ProdutoAfiliado.dataInicioTeste`: setada na criação da primeira campanha (`min(Campanha.dataInicio)`), editável.
- `ProdutoAfiliado.dataUltimaAtualizacaoDados`: `max(CampanhaSnapshot.dataSnapshot)` no recompute; somente leitura.
- `Campanha.dataInicio` / `dataFim` / `dataUltimaAtualizacao` no grão da campanha.

Não confundir com `OfertaDecisao.nextReviewAt` (governança da análise) — o produto também copia `nextReviewAt` para revisão operacional.

## Risks / Trade-offs

- **[Risco]** CSV com gasto *do dia* (não acumulado) subestima o rollup se o operador só importa o último dia.
  → *Mitigação*: UI do import deixa explícito “valores acumulados até a data do snapshot”; checkbox “este CSV é delta do dia” fica **fora** desta change (se aparecer na prática, soma-se ao latest em vez de substituir — follow-up).

- **[Risco]** Matching de nome de campanha frágil (renomeio no Ads).
  → *Mitigação*: `nomeCampanhaGoogleAds` editável; import lista “criadas novas” para o operador fundir/apagar stubs. Sem fuzzy match nesta change.

- **[Risco]** Breaking do widget de capital: ofertas APROVADO_TESTE sem produto somem da alocação.
  → *Mitigação*: Go! continua obrigatório para gastar; widget mostra nota “alocação conta produtos em Testando/Escalando”. Ofertas só no Radar usam `budgetTesteAlocado` como planejado de análise, não como capital comprometido.

- **[Risco]** `OrcamentoPeriodo` vazio no virar do mês zera o painel.
  → *Mitigação*: ao abrir o widget no dia 1, se não houver linha do mês, copiar capital/moeda/limites do período anterior (não o gasto). Operador ajusta.

- **[Risco]** Denormalização de rollup divergente se alguém editar snapshot direto no banco.
  → *Mitigação*: único writer é a API de import/CRUD de snapshot, sempre chama `recomputeProdutoRollups`. Endpoint interno `POST .../recompute` para reparo.

- **[Trade-off]** Toggle de colunas só no `localStorage` não sincroniza entre browsers.
  → *Aceito*: um operador, um browser principal.

- **[Trade-off]** Sem FX: números USD e BRL podem aparecer no mesmo painel.
  → *Mitigação*: `moeda` no produto/campanha; widget usa `moedaBase` do período e marca produtos em moeda diferente com aviso, sem converter.

## Migration Plan

1. Enums + campos em `OfertaDecisao` e `ProdutoAfiliado`; modelos `Campanha`, `CampanhaSnapshot`, `OrcamentoPeriodo` no `schema.prisma`.
2. Script idempotente `prisma/sql/03-campanha-orcamento.sql` para a VPS; local via `prisma db push`.
3. Seed: se `PortfolioConfig` tem capital e não existe `OrcamentoPeriodo` do mês corrente, criar a linha.
4. Estender o fluxo Go! para copiar os campos de herança (produtos já migrados ficam com herança nula até o operador preencher ou re-vincular).
5. APIs + `recomputeProdutoRollups` + novo `getActiveCapitalAllocation`.
6. UI: Radar colunas/toggle; Catálogo ficha operacional + campanhas; modal de orçamento do período; widget planejado vs realizado.
7. Rollback: colunas novas nullable; dropar as três tabelas novas. Widget antigo pode ser restaurado lendo de novo `OfertaDecisao` (código permanece testável atrás da função).

## Open Questions

- Confirmado nesta change: CSV tratado como **acumulado até a data**. Se os exports reais forem sempre “último dia”, reabrir o trade-off do risco 1.
- Papel principal vs contingência é campo da **campanha**, não da `ContaTrafego`. Se no futuro uma conta inteira for só contingência, ainda se marca em cada campanha.
- Fusão de duas campanhas criadas por mismatch de nome: CRUD delete/editar nome nesta change; “merge” explícito fica de fora.
