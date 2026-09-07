## Why

A ficha da campanha não guarda o miolo do experimento — palavras-chave, dispositivos, locais e públicos com lance em % e métricas acumuladas. Sem identidade por índice e sem linha temporal, o operador não registra um +10% numa keyword nem compara vigentes de duas campanhas do mesmo produto. `Termo` é demanda do Radar; `SegmentoCampanhaSnapshot` é grão diário da regra de CPA — nenhum dos dois é essa lista de trabalho.

## What Changes

- Quatro índices por `Campanha`: **Palavra-chave** (N, com correspondência `EXATA`/`FRASE`/`AMPLA`), **Dispositivo** (sempre 3: smartphone, tablet, computador), **Local** (N, nome livre), **Público** (N, rótulo livre).
- Cada índice tem identidade estável + **registro temporal append-only**. Trocar lance de +10% para +15% cria linha nova; a anterior permanece queryable. A ficha mostra só o **vigente** (última linha).
- Lance é **percentual** nos quatro eixos. Métricas na linha (CPC, cliques, impressões, vendas/conversões U$, custo de conversão, ROI onde couber) são **acumulado do índice desde o início da campanha**, reportadas pelo Ads — não substituem o rollup por `VendaAfiliado`.
- Palavra-chave guarda na identidade `validadoVisualmente` e `negativado` (julgamento; não fabricam foto).
- Escrita **manual agora**; coleta regular / API / MCP entra depois no **mesmo cano** (`origem` `MANUAL` | `COLETA`). Creator Engine não escreve no Google Ads.
- Campanha nova **nasce com os 3 dispositivos**.
- Comparativo **do mesmo produto**: vigentes lado a lado (variáveis do experimento × eficiência). Relatório de impacto de um ajuste no tempo fica **fora**.
- Não mistura com `Termo`/`SerieTermo`. Não substitui `SegmentoCampanhaSnapshot` nem `AjusteCampanha`.

## Capabilities

### New Capabilities

- `afiliados-indices-campanha`: identidade e série temporal dos quatro índices; vigente; escrita append (manual/coleta); comparativo de vigentes no produto.

### Modified Capabilities

- `campanha-ficha`: quatro listas vigentes na ficha; criar/editar índice e registrar linha manual; campanha nova materializa os 3 dispositivos.
- `produtos-afiliados`: entrada no comparativo das campanhas do produto (catálogo).

## Impact

- **Schema:** modelos novos de índice + linha temporal; enums de correspondência, status do índice, origem da linha, dispositivo. SQL idempotente em `prisma/sql/`.
- **API:** CRUD autenticado por campanha (append na escrita); GET de vigentes; GET de comparativo por produto. Mesmo contrato serve coleta futura (origem `COLETA`) — sem envelope de ingestão nesta change.
- **UI:** blocos na ficha; tela/seção de comparativo no produto.
- **Fora:** Ads Scripts, `POST /api/afiliados/ingestao`, regras da fila, `AjusteCampanha`, `SegmentoCampanhaSnapshot`, `Termo`, relatório histórico de impacto.
- **Docs:** `CONTEXT.md` — Palavra-chave ≠ Termo; vigente ≠ histórico.
