## Context

`afiliados-operacao-campanha` (implementado, ainda não arquivado) já entregou `Campanha`, `CampanhaSnapshot` (import CSV, `@@unique([campanhaId, dataSnapshot])`), `OrcamentoPeriodo` e `recomputeProdutoRollups` — rollup de **produto**, calculado a partir do snapshot mais recente de cada campanha (`gasto`/`receitaConfirmada` reportados pelo Ads). `2026-08-21-afiliados-campanha-ficha-gasto` deu à `Campanha` uma ficha própria com registro manual de gasto.

O que falta, e que esta change resolve: (1) o ROI usado hoje mede o que o Google Ads reporta, não a comissão real confirmada pela rede — `VendaAfiliado` existe (`vendas-comissoes-afiliados`) mas não sabe de qual campanha veio; (2) não existe contrato para dado externo entrar no sistema além do CSV humano — Ads Scripts, séries de demanda; (3) as regras de teste/escala (`criterioPausa`/`criterioEscala`) são texto livre, sem mecanismo de execução; (4) não existe fila — "decida agora" é implícito, sem lugar canônico.

Todas as decisões abaixo vêm de um mapa wayfinder (`.scratch/afiliados-ciclo-oportunidade-escala/`, 20 tickets fechados) — este design consolida a arquitetura resultante, não relitiga as decisões individuais (ver `## Answer` de cada ticket para o raciocínio completo).

## Goals / Non-Goals

**Goals:**
- Fechar o ciclo ingestão → teste → escala em modelo de domínio + contrato de dado + regra codificada.
- `VendaAfiliado` (comissão real confirmada) vira a fonte de ROI que decide, substituindo o proxy do Ads.
- Um mecanismo único de "decida agora" (fila) e um mecanismo único de limiar configurável, reusados por toda regra nova.

**Non-Goals:**
- Não escreve no Google Ads (lance/budget/pausa) — só recomenda. Exceção deliberada: upload de conversão offline é dado, não decisão.
- Não implementa a automação de coleta de volume de busca real via Keyword Planner API (Fase 2, aguardando aprovação Google) — o modelo de domínio (`Termo`/`SerieTermo`) entra, a automação não.
- Não faz inferência estatística nem ML na camada de aprendizado.
- Não constrói os 7 adapters de webhook por rede de afiliado (ClickBank, Digistore24, etc.) — só o campo/contrato em `VendaAfiliado` que os receberia.

## Decisions

### D1 — Envelope de ingestão único, não rota por grão
Endpoint POST genérico (`{fonte, tipo, periodo, linhas[]}`), despachando por `tipo` (`CAMPANHA_DIARIO` | `SEGMENTO` | `SERIE_TERMO` nesta fase). Autenticado por token dedicado `AFILIADOS_INGEST_TOKEN` (mecanismo de `src/lib/publicacao.ts` generalizado para aceitar o nome da env var), não reaproveita `N8N_PUBLISH_TOKEN` — escopo de token é por domínio/blast-radius, não por chamador.
*Alternativa descartada*: rota por grão — duplicaria registro de coleta, materialização de calendário e auth em N lugares.

### D2 — Materialização de calendário é responsabilidade do endpoint
GAQL omite dias sem métrica ("dia sem métrica não retorna linha" ≠ "não coletado" — significa zero). O envelope carrega `periodo {inicio, fim}` **e** um escopo explícito de entidades cobertas (`campanhasCobertas: [{googleAdsCustomerId, nomeCampanhaGoogleAds}]`), independente de terem gerado linha. O endpoint cruza escopo × período × linhas recebidas e cria os snapshots zero que faltam.
*Alternativa descartada*: cada fonte materializa antes de enviar — duplicaria lógica de calendário em Apps Script, backfill Python, etc.

### D3 — Identidade de campanha por `(googleAdsCustomerId, nomeCampanhaGoogleAds)`, sem auto-criação
Nome de campanha não é globalmente único entre contas Ads. Linha que não casa vai para bandeja `CampanhaNaoReconciliada` (reconciliação manual na UI) — o endpoint genérico não recebe `produtoId`, então não pode inventar o produto de destino (diferente do CSV humano existente, que roda dentro de `/produtos/[id]/campanhas/import-csv` e por isso pode auto-criar).

### D4 — `VendaAfiliado` é a fonte de verdade de ROI; `CampanhaSnapshot.receitaConfirmada` vira auditoria
`Campanha` ganha rollup próprio (`recomputeCampanhaRollups`): `gastoTotalAcumulado` = snapshot mais recente (mesma convenção do rollup de produto); `receitaConfirmadaAcumulada` = soma de `VendaAfiliado.valorComissao` onde `status = APROVADA` e `campanhaId` = a campanha. O rollup de `ProdutoAfiliado` existente **não muda** — os dois cálculos ficam desacoplados, servindo propósitos diferentes (Ads-based = referência; Venda-based = decisão).

### D5 — Atribuição de venda por subid = `Campanha.id`, sem tabela de lookup, sem inferência automática
`Campanha.id` (cuid, ~25 chars) cabe no limite mais apertado documentado entre redes de afiliado (Digistore24, 127 chars) — é opaco, único, estável, então serve como subid direto. Inferência automática (produto+conta+janela de data) foi descartada porque, em produto com campanhas simultâneas, ratear uma venda ambígua corrompe o ROI que decide keep/kill. Fallback é **atribuição manual**, nunca inferência.

### D6 — Mecanismo genérico de limiar (`LimiarGlobal` + override)
Toda regra de decisão (teste, re-teste, escala, segmento, curva ascendente, toggle de upload offline) lê limiares de uma tabela chave→JSON global, com override opcional por produto (`ProdutoAfiliado.limiaresOverride`, JSON) — não constantes hardcoded nem um campo bespoke por regra.

### D7 — Fila de decisão com referência polimórfica fraca, sem FK
`ItemFila.tipoAlvo` (`OFERTA`|`CAMPANHA`) + `alvoId` sem FK — mesmo padrão já usado no Estúdio de Vídeo do repo. Condição de disparo é pura em runtime (calculada, não persistida); só o ciclo de vida (`ABERTO`/`ADIADO`/`APLICADO`/`DISPENSADO`/`EXPIRADO`) é persistido, com dedup por `(regra, tipoAlvo, alvoId)` enquanto não-terminal. Prioridade é atribuída pela regra que gera o item, nunca recalculada pela fila (sem score cross-regra).

### D8 — Máquinas de estado se desacoplam
`ProdutoAfiliado.status` deixa de ser fase de teste e vira presença no catálogo (`ATIVO`/`PAUSADO`/`ARQUIVADO`) — ortogonal ao `Campanha.status` operacional (`TESTANDO`/`ESCALANDO`/`PAUSADO`/`ENCERRADO`), que já é o grão real de decisão (`ProdutoAfiliado.statusOperacional` antigo fica deprecated, sem drop de coluna, mesmo padrão de `criterioPausa`). `OfertaDecisao.statusDecisao` congela na conversão para produto (`EM_EXECUCAO` vira terminal).

### D9 — Upload de conversão offline é dado, não decisão de controle
A fronteira "recomenda, nunca escreve" cobria o loop de ajuste de lance/budget/pausa — enviar conversão confirmada ao Ads não decide nada, alimenta fato. Só venda confirmada (`APROVADA`) sobe; checkout não sobe (já é conversão nativa tempo-real do lado do Ads, ticket 04). Creator Engine monta o CSV pronto (formatação sensível a locale/encoding fica centralizada e testável); Ads Script só busca e repassa a `newCsvUpload()`.

## Risks / Trade-offs

- **[Risco] Migração de semântica de ROI é uma mudança de comportamento em regras já existentes** (qualquer leitura futura que espere `roiReal` vindo do Ads Scripts vai ler o rollup por-venda em vez disso). → Mitigação: `CampanhaSnapshot.receitaConfirmada`/`ProdutoAfiliado.roiReal` continuam existindo e sendo populados como estavam — nada é removido, só um novo par de campos (`Campanha.roiReal`/`cpaReal` via venda) passa a ser o que as regras de decisão leem.
- **[Risco] Bandeja de não-reconciliados pode acumular sem processo de triagem definido.** → Mitigação: fora de escopo desenhar a UI de triagem em detalhe nesta change; o modelo garante que nada se perde (linha fica retida, não descartada).
- **[Risco] `LimiarGlobal` genérico pode virar "gaveta de tudo" sem tipagem por regra.** → Mitigação: cada chave documenta seu shape esperado no seed inicial; validação Zod por chave conhecida na leitura.
- **[Trade-off] Sem detecção de silêncio na coleta (fonte devia ter rodado e não rodou) nesta fase** — `RegistroColeta` grava o fato, mas nenhuma regra ainda consome staleness. Aceito deliberadamente (ver `.scratch/.../map.md` → Not yet specified) — evita inventar uma regra de alerta sem caso de uso real ainda.

## Migration Plan

1. `prisma db push`/migration formal com os modelos e campos novos (aditivo — nenhuma coluna existente é removida; campos deprecated ficam sem drop, mesmo padrão já usado no repo).
2. Seed inicial de `LimiarGlobal` com os valores decididos no charting (piso de comissão, piso de volume 300/mês, magnitude 40%, segmento 3/25%, etc. — ver tasks.md).
3. Backfill: nenhum obrigatório — dados históricos (`keywordsPrioritarias`, snapshots antigos) permanecem lidos como estão; `Campanha.roiReal`/`cpaReal` novos ficam `null` até o primeiro recompute rodar.
4. Rollback: reverter é dropar as tabelas/colunas novas — nada em `CampanhaSnapshot`/`ProdutoAfiliado` existente é alterado destrutivamente, então o rollback não perde dado de produção.

## Open Questions

Nenhuma — todas as decisões de domínio desta fase foram fechadas no mapa wayfinder antes desta proposta ser escrita. Itens genuinamente em aberto (automação de demanda de busca, detecção de silêncio, backfill de schema legado) são Fase 2 ou fog registrado no mapa, não ambiguidade desta change.
