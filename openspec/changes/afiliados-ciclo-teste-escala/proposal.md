## Why

O módulo de Afiliados hoje calcula ROI de produto a partir do valor de conversão **reportado pelo Google Ads** (`CampanhaSnapshot.receitaConfirmada`), não da comissão **real confirmada pela rede** (`VendaAfiliado`) — que também não sabe de qual `Campanha` veio, não tem contrato de ingestão de dado de fontes externas (Ads Scripts, CSV), e não tem um mecanismo canônico de "decida agora" para as regras de teste/escala, que hoje são texto livre não-executável (`criterioPausa`/`criterioEscala`). Sem isso, o diagnóstico keep/kill de campanha não é confiável e não escala além de acompanhamento manual olho no olho.

Esta change fecha o ciclo operacional completo — ingestão → teste → escala — em nível de modelo de domínio, contrato de dado e regra codificada, sobre a fundação já implementada por `afiliados-operacao-campanha` (`Campanha`, `CampanhaSnapshot`, rollups de produto) e `2026-08-21-afiliados-campanha-ficha-gasto` (ficha de campanha).

## What Changes

- **Contrato de ingestão agnóstico de fonte**: endpoint único genérico (`{fonte, tipo, periodo, linhas[]}`) para Ads Scripts, CSV e séries de demanda, com materialização de calendário (dia sem gasto = zero, nunca "não coletado"), bandeja de não-reconciliados e registro de coleta por fonte.
- **`VendaAfiliado` ganha atribuição de campanha** (`campanhaId` opcional, subid = `Campanha.id`) e **vira a fonte de verdade de ROI** que alimenta as regras de decisão — `CampanhaSnapshot.receitaConfirmada` (Ads) passa a ser só auditoria. **BREAKING (semântica de ROI)**: qualquer leitura que hoje assume ROI vem do Ads Scripts precisa migrar para o rollup por campanha baseado em vendas confirmadas.
- **Mecanismo genérico de limiares** (`LimiarGlobal` + override por produto) substitui número mágico espalhado — usado por sete regras diferentes (teste, re-teste, escala, segmento, curva ascendente, upload offline).
- **Fila de decisão codificada** (`ItemFila`): substitui "decida agora" implícito por um mecanismo único com ciclo de vida, prioridade e dedup, consumido por todas as regras abaixo.
- **Regras de teste e escala codificadas**: teto por faixa de comissão + alerta de checkout (teste inicial); árvore de re-teste com fôlego financeiro; gatilho de entrada em escala (mão única, por Campanha); mensuração de escala mensal com alerta de ritmo e recuo por janela de 3 dias.
- **Segmentação geo×dispositivo** por campanha, com regra de otimização em `ESCALANDO`.
- **Registro de ajustes aplicados** (`AjusteCampanha`), origem fila ou manual.
- **Máquinas de estado reconciliadas**: `ProdutoAfiliado.status` vira presença no catálogo (não mais fase de teste); `OfertaDecisao.statusDecisao` congela na conversão; `Campanha.motivoEncerramento` estrutura Falha de Execução vs Falha de Mercado.
- **LP bridge** como atributo da campanha (não entidade).
- **Checkout** como campo (`checkoutsCount`) em `CampanhaSnapshot`, três estados.
- **Modelo de domínio de demanda de busca** (`Termo`/`SerieTermo`) e a regra de curva ascendente que o consome no Radar.
- **Upload de conversões offline** para o Google Ads via Ads Scripts, alimentado por venda confirmada.

Fora de escopo nesta fase (Fase 2, aguardando aprovação de acesso à API do Google): automação de coleta de volume de busca real via Keyword Planner API e a regra de curva de lance por clique que depende desse dado ao vivo.

## Capabilities

### New Capabilities

- `afiliados-ingestao`: contrato de ingestão agnóstico de fonte — envelope genérico, materialização de calendário, bandeja de não-reconciliados, registro de coleta por fonte.
- `afiliados-limiares`: mecanismo genérico de limiares globais com override por produto, consumido por todas as regras de decisão.
- `afiliados-fila-decisao`: `ItemFila` — referência polimórfica fraca, ciclo de vida de 5 estados, prioridade por regra, superfície dupla (fila + embed nas fichas).
- `afiliados-regras-teste-escala`: regras codificadas de teste inicial, re-teste/fôlego financeiro, gatilho de entrada em escala e mensuração de escala mensal.
- `afiliados-segmentos-campanha`: `SegmentoCampanhaSnapshot` geo×dispositivo e regra de otimização em `ESCALANDO`.
- `afiliados-registro-ajustes`: `AjusteCampanha` — captura de ajuste aplicado, origem fila ou manual.
- `afiliados-termo-demanda`: modelo `Termo`/`SerieTermo` e a regra de curva ascendente do Radar que o consome.
- `afiliados-conversao-offline`: upload de conversões offline (venda confirmada) para o Google Ads via Ads Scripts.

### Modified Capabilities

- `vendas-comissoes-afiliados`: `VendaAfiliado` ganha `campanhaId`, par `(tipoIdentificador, valor)` substituindo suposição de `gclid`, `orderId`, `statusUploadAds`; vira fonte de ROI das regras de decisão.
- `campanha-ficha`: `Campanha` ganha `checkoutsCount` (via snapshot), `linkBridge`/`tipoBridge`/`bridgeObservacoes`, `motivoEncerramento`, rollups próprios (`roiReal`, `cpaReal`, `gastoTotalAcumulado`, `receitaConfirmadaAcumulada`); histórico `CampanhaStatusLog`.
- `produtos-afiliados`: `ProdutoAfiliado.status` muda de papel (fase de teste → presença no catálogo: `ATIVO`/`PAUSADO`/`ARQUIVADO`), ortogonal ao estado de campanha.
- `afiliados-conta-trafego`: `ContaTrafego` ganha `googleAdsCustomerId`, usado na identidade do envelope de ingestão.
- `afiliados-radar-decisao`: `OfertaDecisao.statusDecisao` congela (`EM_EXECUCAO` vira terminal) na conversão para produto.

## Impact

- **Schema (Prisma)**: modelos novos `CampanhaNaoReconciliada`, `RegistroColeta`, `LimiarGlobal`, `ItemFila`, `SegmentoCampanhaSnapshot`, `AjusteCampanha`, `CampanhaStatusLog`, `Termo`, `SerieTermo`; campos novos em `VendaAfiliado`, `Campanha`, `CampanhaSnapshot`, `ContaTrafego`, `ProdutoAfiliado`, `OfertaDecisao`; enums novos (`TipoBridge`, `MotivoEncerramento`, `TipoAlvoFila`, `StatusItemFila`, `PrioridadeFila`, `StatusUploadAds`, etc.).
- **API**: endpoint de ingestão genérico (`AFILIADOS_INGEST_TOKEN`); endpoint de leitura de CSV de conversão offline para Ads Scripts; CRUD/consulta de `ItemFila`, `AjusteCampanha`, `SegmentoCampanhaSnapshot`, `Termo`/`SerieTermo`; recompute de rollup por campanha.
- **UI**: ficha de campanha ganha checkout, LP bridge, rollups próprios, histórico de status; fila de decisão própria + embed nas fichas; bandeja de não-reconciliados.
- **Env vars**: `AFILIADOS_INGEST_TOKEN` novo.
- **SQL prod**: script idempotente em `prisma/sql/` para banco existente na VPS (padrão do projeto).
- **Dependências**: nenhuma biblioteca externa nova.
- **Fonte completa das decisões**: `.scratch/afiliados-ciclo-oportunidade-escala/map.md` e `issues/{04,05,06,07,08,09,10,11,12,13,14,15,16,18,20}-*.md`.
