## Context

A ficha (`/afiliados/campanhas/[id]`) já opera keep/kill, gasto, bridge, fila e um bloco magro de `SegmentoCampanhaSnapshot` (geo/dispositivo do mês, sem lance). `Termo`/`SerieTermo` é demanda do Radar e **não** liga a `Campanha`. `AjusteCampanha` é evento de decisão (`BUDGET`/`CPA_ALVO`/`LANCE_SEGMENTO`), nunca inferido por diff.

Falta o miolo do experimento: palavra-chave, dispositivo, local e público — identidade + % de lance + métricas acumuladas — com história append-only para query futura e vigente na tela. Coleta automática (Ads Script / API / MCP) entra depois no mesmo cano.

## Goals / Non-Goals

**Goals:**

- Quatro índices por campanha, identidade estável + linha temporal append-only.
- Ficha mostra só o vigente; escrita manual cria linha nova.
- Lance em % nos quatro eixos. Métricas = acumulado do índice (Ads).
- Campanha nova nasce com 3 dispositivos. Comparativo de vigentes no mesmo produto.
- Mesmo contrato de escrita para `MANUAL` e `COLETA` futura.

**Non-Goals:**

- Não escrever no Google Ads.
- Não estender o envelope `POST /api/afiliados/ingestao` nesta change.
- Não relatório de impacto de um ajuste no tempo.
- Não misturar com `Termo`/`SerieTermo`.
- Não substituir `SegmentoCampanhaSnapshot` (regra `escala.otimizacaoSegmento` continua nele).
- Não criar `AjusteCampanha` ao gravar linha de índice.
- Não estruturar público (gênero+idade) nem local abaixo de nome livre.

## Decisions

### D1 — Um par genérico `IndiceCampanha` + `IndiceCampanhaLinha`

**Decisão:** Um modelo de identidade e um de linha temporal, discriminados por `tipo` (`PALAVRA_CHAVE` | `DISPOSITIVO` | `LOCAL` | `PUBLICO`). Evita oito tabelas e um shape de métrica/lance repetido quatro vezes.

- Identidade: `campanhaId`, `tipo`, `chave` (texto da keyword, nome do local, rótulo do público, ou `SMARTPHONE`/`TABLET`/`COMPUTADOR`), `correspondencia` (`EXATA`|`FRASE`|`AMPLA`, só palavra-chave), `validadoVisualmente`, `negativado` (só palavra-chave; default false).
- Unicidade: `(campanhaId, tipo, chave, COALESCE(correspondencia, ''))` — SQL parcial/COALESCE porque Prisma não expressa unique com NULL distinto no Postgres.
- Linha: `indiceId`, `capturadaEm`, `origem` (`MANUAL`|`COLETA`), `status` (`ATIVO`|`PAUSADO`|`EXCLUIDO`), `ajusteLancePct`, `cpc`, `cliques`, `impressoes`, `vendasConversao`, `custoConversao`, `roi` (nullable; UI de local/público sempre mostra).

**Alternativas:** quatro pares de tabela — mais claro no Prisma, pior para comparativo e para o POST único. Estender `SegmentoCampanhaSnapshot` — grão diário sem identidade, sem lance, sem keyword/público; misturaria a regra de CPA com o álbum do operador.

### D2 — Append-only; vigente = última `capturadaEm`

**Decisão:** Nenhuma linha temporal é updateada. Gravar (manual ou coleta) **insere**. Vigente = `ORDER BY capturadaEm DESC, createdAt DESC LIMIT 1` por índice. Trocar +10 → +15 deixa as duas linhas.

Se o POST de linha omitir métricas, o servidor **copia** as da vigente anterior e grava o novo `%`/status — senão um ajuste de lance zeraria o acumulado na tela.

**Alternativas:** SCD tipo 1 (update in place) — mata a query de histórico. Foto-pacote da campanha inteira — o operador pediu registro por índice, não álbum.

### D3 — Coleta futura last-write-wins na exibição

**Decisão:** A linha mais nova é a vigente, independente da origem. Coleta de amanhã com +10% vira vigente se o operador gravou +15% hoje; a de +15% permanece queryable. Sem regra de “proteger % manual” nesta change.

**Alternativas:** coleta só atualiza métrica se existir linha `MANUAL` mais nova — aditivo depois, se doer.

### D4 — Dois ledgers, sem fusão

**Decisão:** `AjusteCampanha` continua só evento de decisão (fila/manual de budget/CPA/lance de *segmento da regra*). Escrever índice **não** cria `AjusteCampanha`. `SegmentoCampanhaSnapshot` e `Termo` intocados.

### D5 — Seed dos 3 dispositivos no create (+ backfill)

**Decisão:** `POST` de campanha, na mesma transação, cria três `IndiceCampanha` `DISPOSITIVO` (`SMARTPHONE`, `TABLET`, `COMPUTADOR`) e uma linha inicial cada (`origem=MANUAL`, `status=ATIVO`, `ajusteLancePct=0`, métricas nulas). Campanhas já existentes: backfill idempotente no SQL/apply (só se faltar o trio).

### D6 — API de sessão, um cano

**Decisão:**

| Método | Rota | Efeito |
|---|---|---|
| GET | `/api/afiliados/campanhas/[id]/indices` | identidades + vigente |
| POST | `/api/afiliados/campanhas/[id]/indices` | cria identidade + primeira linha (`origem` default `MANUAL`) |
| PATCH | `/api/afiliados/campanhas/[id]/indices/[indiceId]` | só flags de identidade (`validadoVisualmente`, `negativado`) — sem foto |
| POST | `/api/afiliados/campanhas/[id]/indices/[indiceId]/linhas` | append; `origem` default `MANUAL` |
| GET | `/api/afiliados/produtos/[id]/comparativo` | vigentes de todas as campanhas do produto |

Auth: sessão. `origem=COLETA` aceito no body para o MCP futuro; sem token M2M nesta change. Dispositivo não se cria pela UI (já nasceu); local/público/keyword sim. Dispositivo `chave` fora do trio é 422.

### D7 — Comparativo: vigentes do produto, alinhamento por chave

**Decisão:** Tela autenticada sob o produto (`/afiliados/produtos/[id]/comparativo`). Colunas = campanhas; linhas alinhadas por `(tipo, chave, correspondencia)`. Cabeçalho da coluna: variáveis já na `Campanha` (`geo`, `estrategia`, `tipoBridge`, conta, `status`) + rollups de decisão (`roiReal`/`cpaReal` por venda). Catálogo ganha o link. Sem seletor de data — só vigente.

## Risks / Trade-offs

- [Coleta futura sobrescreve % manual na tela] → História intacta; regra de proteção é aditiva (D3).
- [Métricas do índice são Ads, não `VendaAfiliado`] → Copy na ficha/comparativo: acumulado do índice (Ads). Keep/kill continua no rollup da campanha.
- [Unique com NULL no Postgres] → `COALESCE(correspondencia, '')` no SQL; teste de unicidade keyword vs device.
- [Dois geos: `Campanha.geo` vs índices `LOCAL`] → Declarado vs observado; sem constraint. Mesma decisão do ticket 11.
- [Campanhas antigas sem trio] → Backfill no apply; ficha não assume create recente.

## Migration Plan

1. Prisma + SQL idempotente `prisma/sql/17-indices-campanha.sql` (enums, tabelas, unique COALESCE, backfill dos 3 dispositivos).
2. API + UI da ficha + comparativo.
3. Rollback: dropar tabelas/enums novos. Nada em `Campanha`/`CampanhaSnapshot`/`SegmentoCampanhaSnapshot` é alterado destrutivamente.

## Open Questions

Nenhuma bloqueante. Proteção de % manual contra coleta e relatório de impacto ficam para changes futuras.
