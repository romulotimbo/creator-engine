# 05 — Modelo de domínio: Termo e série de busca

Type: grilling
Status: closed
Blocked by: —

## Question

Hoje termos são `keywordsPrioritarias String[]` em `OfertaDecisao` — um array de strings sem
identidade, sem geo e sem histórico. Todo o estágio de oportunidade depende de substituir isso.

**Restrições herdadas do ticket 22 (fechado):** a série guarda `fonte` (`GOOGLE_KEYWORD_PLANNER` |
`BING`) e `unidade` (`ABSOLUTO` | `IMPRESSOES`) explícitos — nunca um índice 0–100 genérico, esse
caminho foi descartado. A série é opcional (Radar degrada sem ela) e o modelo precisa de um terceiro
estado explícito "sem dado" ≠ "demanda zero" (não confundir ausência de linha com valor `0`).

Decidir:

- **Termo é global ou pertence a um produto?** Um mesmo termo ("keto gummies") pode servir várias
  ofertas concorrentes; a série de busca é uma propriedade do termo e do geo, não do produto. Isso
  sugere `Termo` global + tabela de ligação — confirmar ou refutar.
- **Chave da série**: `(termo, geo, fonte, data)`. Uma entidade de série com campo de unidade
  (`ABSOLUTO` vs `INDICE`) ou duas entidades separadas? A resposta depende da granularidade que o
  ticket 01 apurar — se as duas fontes tiverem cadências diferentes, uma tabela só com unidade
  explícita tende a ganhar.
- **Vínculo com o ciclo**: um termo se liga a `OfertaDecisao` (radar), a `ProdutoAfiliado` (execução),
  a `Campanha` (termos da campanha viva), ou aos três? Lembrar que a série é insumo do ciclo inteiro
  — a regra de re-teste consulta Trends de uma campanha viva.
- **Migração** de `keywordsPrioritarias` existente.
- Termo de campanha viva (acompanhamento diário) e termo de aprendizado (agregado semanal) são a
  mesma entidade com duas cadências de coleta, ou coisas diferentes?

## Decision (24/08/2026)

Fechado por interview (`/grilling`). Forma final do modelo:

1. **`Termo` pertence ao produto, não é global.** Sem tabela de ligação — decisão explícita contra a
   sugestão original do ticket (evita a duplicação de série entre ofertas concorrentes no mesmo
   termo, mas o operador preferiu o modelo mais simples de posse direta).
2. **Uma entidade `SerieTermo` só**, não duas por fonte — `fonte` e `unidade` são 1:1
   (`GOOGLE_KEYWORD_PLANNER`→`ABSOLUTO`, `BING`→`IMPRESSOES`), então o enum já garante que ninguém
   soma as duas sem querer. Chave `@@unique([termoId, geo, fonte, data])`. **Três estados sem coluna
   extra**: ausência de linha = não coletado; linha com `valor = null` = coletado sem dado (caso
   `nerve pain supplement` do ticket 06); `valor = 0` = demanda zero confirmada.
3. **`Termo` liga a `OfertaDecisao` OU `ProdutoAfiliado`, nunca aos dois e nunca a `Campanha`.**
   Segue o padrão já existente no schema de herança-por-cópia (`ProdutoAfiliado` já duplica
   `conversionPoint`/`tipoProduto`/`ltvEstimadoRebill`/`scoreOrigem` da Oferta na promoção, em vez de
   manter uma referência viva) — Termo nasce em `OfertaDecisao` no Radar e é **copiado** para
   `ProdutoAfiliado` na promoção. Não liga a `Campanha`: com o acompanhamento diário descartado
   (ticket 22), não sobra nenhuma regra que precise de série por campanha — termos de busca reais
   que geraram clique numa campanha são um conceito diferente (search terms report do Ads Scripts,
   território dos tickets 02/11), fora deste modelo.
4. **Sem migração.** `keywordsPrioritarias` está vazio na base atual — não há dado real a preservar,
   então nenhum script de migração é necessário. `keywordsPrioritarias`,
   `volumeBuscaMensal`/`cpcMinimo`/`cpcMaximo`/`cpcMedioEsperado` ficam marcados **deprecated**
   (parar de escrever/exibir), sem dropar as colunas agora — eram entrada manual, não série real, e
   virar `SerieTermo` fabricada envenenaria a semântica de "sem dado". Remoção definitiva é ticket de
   limpeza futuro, depois que a ingestão do Keyword Planner estiver rodando de verdade.
5. **A modelagem não carrega cadência nenhuma.** Cadência é propriedade implícita da `fonte`
   (Keyword Planner = mensal, Bing = o que o endpoint der, hoje sem consumidor). Agendamento/"hora de
   coletar de novo" é escopo do contrato de ingestão (ticket 14), não deste modelo — aditivo se
   precisar no futuro, não retrabalho.

**Nota de implementação não resolvida aqui** (fica para quando o schema Prisma for escrito de fato):
impor "exatamente um de `ofertaDecisaoId`/`produtoAfiliadoId` preenchido" e unicidade de `texto` por
dono precisa de constraint parcial — Prisma não gera isso nativamente, exige SQL adicional ou
validação em código.

**Desbloqueia o ticket 06** (regra de curva ascendente).
