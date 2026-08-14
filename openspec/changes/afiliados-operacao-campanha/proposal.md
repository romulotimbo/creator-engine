## Why

O Radar e o Catálogo hoje separam análise comercial de operação real: a ficha da oferta guarda o contexto de decisão, mas a tabela não deixa bater o olho; o produto que gasta em Ads não herda `conversion_point`/budget/LTV e não tem gasto, receita nem ROI reais; o painel de capital soma só o planejado e fica zerado porque não há orçamento de período nem gasto realizado. Sem uma entidade de campanha (geo × conta × estratégia) e série temporal de snapshots, é impossível saber qual fatia de um produto está lucrativa e quando o teste estourou sem decisão.

## What Changes

- **Radar (visão de tabela):** promover colunas da ficha para a listagem, com toggle de visibilidade e filtros — `completude_dados`, `vertical`, `geo_prioritario` + contagem de `geos_permitidos`, `vol_buscas_mensal`, `brand_bidding_permitido`, `proxima_revisao` (badge se vencida), `dias_desde_criacao_oferta`, `saturacao_afiliados`, `origem_descoberta`. Persistir na Offer os campos do mapeamento que ainda não existem (`conversionPoint`, `tipoProduto`, `ltvEstimadoRebill`, `saturacaoAfiliados`, `criterioPausa`, `criterioEscala`).
- **Catálogo de Produtos:** deixar de ser ficha comercial estática e virar visão operacional — herda contexto da Offer de origem (link clicável, vertical, tipo, conversion point, LTV, score histórico), lista contas Ads (não só contagem), domínios com link ao histórico, datas de início de teste e última atualização de dados, status operacional distinto do comercial, métricas financeiras (rollup) e critérios de pausa/escala editáveis por produto.
- **Nova entidade `Campanha` (1:N com `ProdutoAfiliado`)** e **`CampanhaSnapshot` (1:N com Campanha):** granularidade geo/conta/estratégia; cada import de CSV vira linha nova (não sobrescreve). Rollups automáticos no produto (`gasto_total_acumulado`, `receita_confirmada_acumulada`, `roi_real`, `cpa_real`, `% budget consumido`).
- **Orçamento de portfólio por período:** capital total, moeda base, teto % por produto, reserva mínima; painel mostra alocado (planejado) vs gasto (realizado) lado a lado; alerta quando gasto > budget alocado sem `DecisionLog` recente de pausa/escala.
- **BREAKING (comportamento do painel de capital):** `getActiveCapitalAllocation()` passa a somar `ProdutoAfiliado.budgetTesteAlocado` de produtos em Testando/Escalando (quem gasta) em vez de `OfertaDecisao.budgetTesteAlocado` de ofertas APROVADO_TESTE/EM_EXECUCAO. Ofertas ainda não migradas a produto deixam de aparecer como alocação ativa.

## Capabilities

### New Capabilities

- `campanha-afiliado`: Entidade `Campanha` (1:N `ProdutoAfiliado`) com conta Ads, geo, estratégia, budgets e status operacional; `CampanhaSnapshot` append-only alimentado por import CSV; rollups derivados no produto; alerta de orçamento estourado por campanha/produto.
- `orcamento-periodo`: Configuração de capital por período (`OrcamentoPeriodo`: capital total, moeda, teto % por produto, reserva mínima) e tela para o operador definir o valor que hoje aparece como $0,00.

### Modified Capabilities

- `afiliados-radar-decisao`: Campos novos em `OfertaDecisao` (`conversionPoint`, `tipoProduto`, `ltvEstimadoRebill`, `saturacaoAfiliados`, `criterioPausa`, `criterioEscala`); tabela do Radar promove colunas da ficha com toggle de visibilidade e filtros (completude, vertical, geo, volume, brand bidding, idade, saturação).
- `produtos-afiliados`: Catálogo operacional — herança da Offer na conversão Go!, status operacional vs comercial, contas Ads detalhadas, datas de teste/atualização, rollups financeiros visíveis, critérios de pausa/escala editáveis no produto.
- `capital-allocation-panel`: Widget passa a exibir capital disponível, alocado (planejado no produto), gasto realizado (rollup de campanhas), livre, % consumido do período e alertas de estouro; fonte de alocação deixa de ser a Offer.
- `offer-review-queue`: `proxima_revisao` como coluna da tabela do Radar (não só filtro), com destaque visual na linha quando `isReviewDue()`.
- `offer-discovery-source`: `origem_descoberta` como coluna e filtro na tabela do Radar (fecha o loop de aprendizado do processo).
- `domain-usage-history`: Catálogo de produtos exibe domínio(s) em uso com link para o histórico de reputação (`DomainUsageLog`).

## Impact

- **Schema (Prisma):** novos modelos `Campanha`, `CampanhaSnapshot`, `OrcamentoPeriodo`; novos enums (`ConversionPoint`, `TipoProdutoAfiliado`, `SaturacaoAfiliados`, `StatusOperacional`, `EstrategiaCampanha`); campos novos em `OfertaDecisao` e `ProdutoAfiliado`; `PortfolioConfig` ganha guardrails ou é lido em conjunto com `OrcamentoPeriodo`.
- **API:** CRUD de campanhas; import CSV de performance append-only (`CampanhaSnapshot`); rollups recalculados no servidor; `GET/PUT` de orçamento do período; `getActiveCapitalAllocation()` com colunas planejado vs realizado e lista de alertas; listagem do Radar com colunas novas; listagem/ficha do Catálogo com payload operacional.
- **UI:** tabela do Radar com colunas promovidas + toggle; Catálogo com ficha operacional e sub-lista de contas/campanhas; tela/modal de orçamento do período; widget de capital com duas colunas e alertas; formulário da Offer com os campos que faltam.
- **Dados:** import CSV deixa de ser “número único sobrescrito”; histórico de snapshots é a fonte de verdade do gasto/ROI. Moeda base do período normaliza exibição (USD/BRL).
- **Dependências:** nenhuma biblioteca externa nova — Prisma, Next.js API routes, React, Zod, ExcelJS/CSV parser já existentes.
- **SQL prod:** script idempotente em `prisma/sql/` para banco existente na VPS (padrão do projeto).
