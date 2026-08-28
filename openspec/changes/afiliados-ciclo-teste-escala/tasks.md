## 1. Prisma Schema — enums e modelos novos

- [x] 1.1 Enums novos: `TipoIngestao` (CAMPANHA_DIARIO|SEGMENTO|SERIE_TERMO), `StatusColeta`, `DimensaoSegmento` (GEO|DISPOSITIVO), `TipoBridge`, `MotivoEncerramento`, `TipoAlvoFila`, `StatusItemFila`, `PrioridadeFila`, `OrigemAjuste`, `TipoAjuste`, `StatusUploadAds`, `FonteTermo`, `UnidadeSerieTermo`
- [x] 1.2 `ContaTrafego.googleAdsCustomerId String?`
- [x] 1.3 `CampanhaSnapshot.updatedAt DateTime @updatedAt`; `CampanhaSnapshot.checkoutsCount Int?`
- [x] 1.4 `Campanha`: `linkBridge`, `tipoBridge`, `bridgeObservacoes`, `motivoEncerramento`, `gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`, `cpaReal` (rollup próprio, distinto do de `ProdutoAfiliado`)
- [x] 1.5 `ProdutoAfiliado.limiaresOverride Json?`; marcar `statusOperacional` como deprecated no comentário do schema (sem drop)
- [x] 1.6 Model `CampanhaNaoReconciliada` (dados brutos da linha + timestamp + fonte)
- [x] 1.7 Model `RegistroColeta` (`fonte`, `tipo` — unique composto —, `ultimaExecucaoEm`, `ultimoPeriodoCoberto` Json, `ultimoStatus`, `ultimoErro`)
- [x] 1.8 Model `LimiarGlobal` (`chave` unique, `valor` Json)
- [x] 1.9 Model `ItemFila` (`tipoAlvo`, `alvoId` sem FK, `regra`, `prioridade`, `resumo`, `status`, timestamps; index em `(regra, tipoAlvo, alvoId)`)
- [x] 1.10 Model `SegmentoCampanhaSnapshot` (`campanhaId` FK Cascade, `dimensao`, `valor`, `data`, métricas; unique `(campanhaId, dimensao, valor, data)`)
- [x] 1.11 Model `AjusteCampanha` (`campanhaId` FK, `itemFilaId` FK opcional, `origem`, `tipo`, `valorAnterior`/`valorNovo` Decimal?, `data`, `motivo`)
- [x] 1.12 Model `CampanhaStatusLog` (mesmo formato de `PersonaStatusLog`, FK `campanhaId` Cascade)
- [x] 1.13 Model `Termo` (`produtoId` FK opcional, `ofertaDecisaoId` FK opcional — exatamente um dos dois, nunca `campanhaId`)
- [x] 1.14 Model `SerieTermo` (`termoId` FK Cascade, `geo`, `fonte`, `data`, `valor` Decimal? nullable, `unidade`, `origem` manual/automatizado; unique `(termoId, geo, fonte, data)`)
- [x] 1.15 `VendaAfiliado`: `campanhaId String?` (FK `onDelete: SetNull`), `tipoIdentificador`/`valorIdentificador` substituindo suposição de `gclid`, `orderId String?`, `statusUploadAds` (default `PENDENTE`)
- [x] 1.16 `prisma generate`; `npx prisma db push` (verificar Postgres local no ar antes)

## 2. SQL de produção e seed

- [x] 2.1 Script idempotente `prisma/sql/NN-ciclo-teste-escala.sql` (próximo número da sequência do repo) cobrindo todos os modelos/campos da seção 1
- [x] 2.2 Seed de `LimiarGlobal`: `teste.pisoVolumeBuscaMensal=300`, `radar.pisoMagnitudePct=40`, `segmento.volumeMinimoConversoes=3`, `segmento.diferencaCpaMinimaPct=25`, `folego.tetoInicialUsd=200`, `folego.tetoCaixaFormadoUsd=600`, `conversaoOffline.ativoPorFase` (`{TESTANDO: false, ESCALANDO: true}`)

## 3. Validação Zod e tipos

- [x] 3.1 Schema do envelope de ingestão (`{fonte, tipo, periodo, linhas[], campanhasCobertas[]}` e a variante de falha `{fonte, tipo, status: FALHA, erro}`)
- [x] 3.2 Schema de `VendaAfiliado` estendido (`campanhaId`, `tipoIdentificador`/`valorIdentificador`, `orderId`)
- [x] 3.3 Schemas de `ItemFila`, `AjusteCampanha`, `SegmentoCampanhaSnapshot`, `Termo`/`SerieTermo`, `LimiarGlobal`

## 4. Contrato de ingestão

- [x] 4.1 `src/lib/publicacao.ts`: generalizar `getPublishToken`/`assertPublishToken` para aceitar nome de env var; criar wrapper para `AFILIADOS_INGEST_TOKEN`
- [x] 4.2 `POST /api/afiliados/ingestao`: despacho por `tipo`, casamento por `(googleAdsCustomerId, nomeCampanhaGoogleAds)`, grava `CampanhaNaoReconciliada` quando não casa
- [x] 4.3 Materialização de calendário: cruzar `periodo` × `campanhasCobertas` × `linhas[]`, criar snapshots zerados para o que faltar (grão `CAMPANHA_DIARIO`)
- [x] 4.4 Upsert idempotente por chave natural para `SEGMENTO` (`SegmentoCampanhaSnapshot`) e `CAMPANHA_DIARIO` (`CampanhaSnapshot`, incluindo `checkoutsCount`)
- [x] 4.5 Ingestão de `SERIE_TERMO`: upsert em `SerieTermo` por `(termoId, geo, fonte, data)` — resolver `termoId` por produto/oferta antes de persistir
- [x] 4.6 `RegistroColeta`: atualizar em toda execução bem-sucedida; gravar relato de falha explícito
- [x] 4.7 UI: bandeja de não-reconciliados (listar `CampanhaNaoReconciliada`, ação de vincular manualmente a uma `Campanha`)
- [x] 4.8 Testes: materialização de calendário, upsert last-write-wins, rejeição de tipo desconhecido, token ausente/incorreto

## 5. VendaAfiliado — atribuição e rollup por campanha

- [x] 5.1 `src/lib/afiliados/rollups.ts`: `computeCampanhaRollups`/`recomputeCampanhaRollups` (gasto = snapshot mais recente; receita = soma de `VendaAfiliado.valorComissao` onde `APROVADA` e `campanhaId` = campanha)
- [x] 5.2 Chamar `recomputeCampanhaRollups` em toda escrita relevante de `VendaAfiliado` (criação, mudança de status, mudança de `campanhaId`)
- [x] 5.3 Atribuição automática por subid: ao criar/atualizar venda, se `valorIdentificador` casa com `Campanha.id`, preencher `campanhaId`
- [x] 5.4 UI de vendas: atribuição manual de campanha quando `campanhaId` é nulo
- [x] 5.5 Testes: rollup exclui `PENDENTE`/`CANCELADA`/`ESTORNADA`; estorno pós-`ESCALANDO` não reverte `Campanha.status`

## 6. Ficha de campanha — checkout, LP bridge, status log, rollups

- [x] 6.1 UI da ficha: exibir `checkoutsCount`, `linkBridge`/`tipoBridge`/`bridgeObservacoes`, `motivoEncerramento` (seletor ao mudar para `ENCERRADO`), rollups por venda vs. referência do Ads lado a lado
- [x] 6.2 `PATCH /api/afiliados/campanhas/[id]`: aceitar os campos novos; gravar `CampanhaStatusLog` em toda mudança de `status`
- [x] 6.3 UI: histórico de `CampanhaStatusLog` na ficha (somente leitura)
- [x] 6.4 UI: embed somente-leitura de `ItemFila` abertos daquela campanha na ficha

## 7. Fila de decisão

- [x] 7.1 `src/lib/afiliados/fila.ts`: função de dedup por `(regra, tipoAlvo, alvoId)` enquanto não-terminal; helper para regras gerarem `ItemFila`
- [x] 7.2 API: `GET /api/afiliados/fila` (listar não-terminais, ordenado por prioridade), `PATCH /api/afiliados/fila/[id]` (confirmar/adiar/dispensar)
- [x] 7.3 UI: tela própria da fila
- [x] 7.4 Ao confirmar um item que resulta em ajuste de campanha, exigir valor real aplicado e criar `AjusteCampanha` (`origem=FILA`)
- [x] 7.5 Testes: dedup, transições de estado, prioridade não recalculada pela fila

## 8. Regras de teste inicial

- [x] 8.1 `src/lib/afiliados/regras/teste.ts`: teto por faixa de comissão (100% até US$100, US$100 fixo acima), USD sem conversão
- [x] 8.2 Gate de checkout crescente por faixa (0→1→2→2 herdado); anexar como evidência no `ItemFila` de teto, nunca segundo teto
- [x] 8.3 Alerta de faixa >US$100 (checkout 50-60% do gate) como `ItemFila` próprio
- [x] 8.4 Job/trigger que avalia a regra a cada novo `CampanhaSnapshot`/`VendaAfiliado` de campanha `TESTANDO`
- [x] 8.5 Testes: faixas cumulativas, herança de gate, alerta antes do teto

## 9. Re-teste, fôlego financeiro e gatilho de escala

- [x] 9.1 `src/lib/afiliados/regras/reteste.ts`: árvore única (teto + 1-3 vendas `APROVADA` + ROI empatando ±10%) consultando `SerieTermo` mais recente para decidir extensão vs. redução de CPA
- [x] 9.2 Fôlego financeiro: teto absoluto em USD (menor entre extensão calculada e limiar por perfil), acumulado por produto via `campanhaOrigemId`
- [x] 9.3 `src/lib/afiliados/regras/escala.ts`: gatilho de entrada em escala (volume + ROI com folga sobre breakeven), gera `ItemFila`, nunca automático
- [x] 9.4 Reforçar mão-única: rejeitar transição `ESCALANDO → TESTANDO` na API de `Campanha`
- [x] 9.5 Testes: pré-condição composta do re-teste, teto de fôlego vence extensão em comissão, mão-única

## 10. Mensuração de escala mensal

- [x] 10.1 `src/lib/afiliados/regras/mensuracao-escala.ts`: corte de ROI mensal via `LimiarGlobal`, binário → `ItemFila` de diagnóstico
- [x] 10.2 Alerta de ritmo de entrega (gasto do dia × budget diário), informativo, sem `ItemFila`
- [x] 10.3 Regra dos 5-10% (budget + CPA) como item único; janela de 3 dias pré/pós ajuste para recuo, escopado ao `AjusteCampanha`
- [x] 10.4 Testes: janela mensal vs. semanal auxiliar, recuo não dispara fora da janela de 3 dias

## 11. Segmentos geo×dispositivo

- [x] 11.1 Ingestão de `SEGMENTO` já coberta na seção 4 — validar cadência diária e os 7 valores crus de dispositivo
- [x] 11.2 `src/lib/afiliados/regras/segmento.ts`: regra de otimização (só `ESCALANDO`, mês calendário, limiares de `LimiarGlobal`), um `ItemFila` por campanha por mês combinando geo+dispositivo
- [x] 11.3 UI: exibir segmentos na ficha da campanha (filtrando os 3 valores de dispositivo acionáveis)
- [x] 11.4 Testes: volume mínimo e diferença de CPA, item único por mês

## 12. Registro de ajustes

- [x] 12.1 API: `POST /api/afiliados/campanhas/[id]/ajustes` (origem MANUAL) — já coberto parcialmente pela confirmação de fila (seção 7.4)
- [x] 12.2 UI: lista de `AjusteCampanha` na ficha, com origem, tipo, valores e motivo
- [x] 12.3 Testes: um `ItemFila` gerando múltiplos `AjusteCampanha` (segmento geo+dispositivo); data retroativa só em `MANUAL`

## 13. Máquinas de estado

- [x] 13.1 Repurpose `ProdutoAfiliado.status` para `ATIVO`/`PAUSADO`/`ARQUIVADO`; migração de dados existentes (mapear valores atuais de `statusOperacional`)
- [x] 13.2 `OfertaDecisao.statusDecisao`: travar `EM_EXECUCAO` como terminal na API de update
- [x] 13.3 UI: seletor de `motivoEncerramento` ao encerrar campanha (já coberto na seção 6.2); refletir Falha de Execução vs Falha de Mercado na Viabilidade do Produto
- [x] 13.4 Testes: rejeição de transição de oferta convertida, produto com campanhas em fases diferentes

## 14. Termo, SerieTermo e curva ascendente

- [x] 14.1 CRUD de `Termo` ligado a `OfertaDecisao` ou `ProdutoAfiliado` (nunca os dois)
- [x] 14.2 `src/lib/afiliados/regras/curva-ascendente.ts`: portão de busca + modificador de rede, piso de magnitude 40% via `LimiarGlobal`, piso de volume 300/mês, exceção saída-do-zero
- [x] 14.3 UI: indicador de prioridade na tabela do Radar; `scoreBreakdown` com termos disparadores
- [x] 14.4 Testes: busca caindo exclui sempre, saída-do-zero ignora piso de magnitude

## 15. Upload de conversões offline

- [x] 15.1 Endpoint de leitura que gera CSV pronto (`Google Click ID`/`order_id`, `Conversion Name`, `Conversion Time`, `Parameters:TimeZone=`) a partir de `VendaAfiliado APROVADA` elegíveis
- [x] 15.2 Exclusão por rede com integração nativa (config declarativa, não detecção)
- [x] 15.3 Cálculo de janela de 90 dias e gravação de `statusUploadAds`
- [x] 15.4 Retratação: gerar linha `RETRACTION` quando venda enviada vira `ESTORNADA`, usando `orderId` ou fallback `(tipoIdentificador, valorIdentificador)` + timestamp
- [x] 15.5 Toggle por fase via `LimiarGlobal`/`limiaresOverride`
- [x] 15.6 Testes: exclusão de rede nativa, fora da janela, retratação com e sem order id, toggle por fase

## 16. QA e fechamento

- [x] 16.1 `npm test` — suíte completa
- [x] 16.2 Smoke manual: ingestão end-to-end (envelope → snapshot → rollup de campanha → fila → ajuste)
- [x] 16.3 Atualizar `CLAUDE.md` se a estrutura de arquivos ou scripts mudar
- [ ] 16.4 Rodar `/openspec-archive-change` após validação em produção
