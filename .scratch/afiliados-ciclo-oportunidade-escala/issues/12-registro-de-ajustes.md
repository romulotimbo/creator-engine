# 12 — Registro dos ajustes aplicados manualmente

Type: grilling
Status: closed
Blocked by: 10, 11
Assignee: claude

## Question

O sistema recomenda e o operador aplica no Google Ads. Isso cria uma lacuna: **o sistema não sabe o
que foi feito**. E várias regras dependem exatamente disso:

- "Subir 5 a 10% a cada **24h**" — precisa saber quando foi o último aumento.
- "Se perder margem **após um aumento**, recuar imediatamente" — precisa do instante do aumento para
  atribuir a queda a ele.
- "Reduzir o CPA alvo em 5 a 10%" quando o Trends cai — precisa saber se já foi reduzido.
- A camada de aprendizado precisa distinguir campanha que teve ajuste fino de campanha que rodou solta.

Decidir:

- **Entidade de ajuste**: o que registra (tipo, valor anterior, valor novo, data, campanha,
  segmento afetado, motivo/recomendação que originou).
- **Como o registro acontece**: entrada manual na ficha da campanha, confirmação de um item da fila
  ("apliquei esta recomendação"), ou **detecção** por diff entre snapshots consecutivos (Ads Scripts
  pode reportar o budget corrente — uma mudança de budget entre dois dias é um ajuste inferido).
  A terceira opção elimina trabalho manual mas não captura o motivo.
- **Ajustes não recomendados**: o operador mexe por conta própria. O registro aceita isso, ou só
  registra o que veio da fila?
- Relação com a fila: um item de fila aplicado vira ajuste registrado e sai da fila. Um item
  ignorado — expira, reaparece, ou fica?

## Nota herdada do ticket 10

O ticket [Regras de escala: mensuração semanal/mensal e ritmo de aumento](10-regras-escala-mensuracao-ritmo.md)
fechou duas regras que dependem diretamente da entidade que este ticket desenha:

- **Sugestão de próximo aumento (regra 5–10%)**: dispara quando passam ≥24h desde o último ajuste
  registrado daquela campanha (ou desde a entrada em `ESCALANDO`, se ainda não houve ajuste). O
  registro precisa expor "qual foi o último ajuste de budget/CPA desta campanha e quando" de forma
  consultável.
- **"Recuar imediatamente"**: compara ROI dos 3 dias antes vs. 3 dias depois de um ajuste específico,
  ancorado no campo `data` do ajuste. O registro precisa guardar a data exata do ajuste (não só que
  ele ocorreu) para essa janela ser calculável, e o item de fila resultante referencia esse ajuste
  específico ("desfazer o aumento de [data]").

Nenhuma das duas exige que este ticket resolva o mecanismo de captura (manual vs. detecção por
diff) — só fixa que, seja qual for a forma escolhida, `data`, `campanhaId`, tipo (budget/CPA) e
valor novo precisam estar presentes e consultáveis por campanha.

## Decision (27/08/2026)

Fechado por interview (`/grilling`). Sete decisões, nesta ordem:

1. **Mecanismo de captura: híbrido manual + confirmação de fila, sem detecção por diff.**
   Confirmar um `ItemFila` ("apliquei esta recomendação") é a via preferencial — motivo já vem do
   próprio item, fricção mínima. A ficha da campanha também expõe um "registrar ajuste manual" para
   o operador que mexeu por conta própria. Diff entre snapshots de budget consecutivos (Ads Scripts
   reporta budget corrente) fica **fora do mecanismo de registro em v1** — não captura `motivo`, e
   duplicaria a leitura que já alimenta `CampanhaSnapshot`. Fica registrado em "Not yet specified"
   como reconciliação futura (alertar se o budget observado diverge do último ajuste registrado),
   não como fonte de verdade.
2. **Campo `origem` (`FILA` | `MANUAL`) resolve de graça a Decisão 3 do ticket** (ajustes não
   recomendados): o registro aceita os dois caminhos. `origem = FILA` carrega `itemFilaId` e herda
   `motivo` do item; `origem = MANUAL` tem `itemFilaId` nulo e `motivo` livre. `motivo` é **opcional**
   nos dois casos — exigi-lo travaria o registro e empurraria o operador a simplesmente não registrar,
   o que é pior para as regras que dependem de `data`/`valorNovo`.
3. **`tipo` é enum de três valores: `BUDGET` | `CPA_ALVO` | `LANCE_SEGMENTO`.** O terceiro cobre as
   recomendações de lance por segmento do ticket
   [Segmentos geo × dispositivo](11-segmentos-geo-dispositivo.md) (`escala.otimizacaoSegmento`), que
   não são nem budget nem CPA-alvo. Campo `segmento` (`dimensao` `GEO`|`DISPOSITIVO` + `valor`) só
   preenchido quando `tipo = LANCE_SEGMENTO`.
4. **`valorAnterior`/`valorNovo` como `Decimal?` homogêneos nos três tipos**, não campos dedicados por
   tipo. Para `BUDGET`/`CPA_ALVO` são valores absolutos (antes/depois). Para `LANCE_SEGMENTO` não
   existe "lance-base" que o sistema conheça (nenhum ticket fechado ingere modificador de lance por
   segmento de volta) — `valorNovo` guarda o percentual aplicado (`15` = +15%), `valorAnterior` fica
   nulo. Nenhuma regra fechada (07-11) relê o valor de um `LANCE_SEGMENTO` depois — só `BUDGET`/
   `CPA_ALVO` alimentam as janelas de 24h e recuo imediato do ticket 10.
5. **Confirmar um item de fila exige digitar o valor real aplicado**, não assume a recomendação (que é
   sempre uma faixa — "5 a 10%", "+10 a 30%"). O modal de confirmação pré-preenche um palpite dentro
   da faixa, editável. `valorAnterior` o sistema já sabe (campo corrente da campanha antes do ajuste).
6. **`data` é `DateTime` completo, editável quando `origem = MANUAL`** (default "agora", permite
   retroagir — um registro tardio sem isso contaminaria as janelas de 24h e de 3 dias do ticket 10 com
   o instante errado). Quando `origem = FILA`, `data` não é editável — é o instante da confirmação
   (aplicar e registrar são o mesmo ato).
7. **`itemFilaId` não é único em `AjusteCampanha` — relação 1-para-N.** O ticket 11 já decidiu que
   geo e dispositivo disparando no mesmo mês viram **um** `ItemFila`, com o breakdown no `payload`. Se
   o operador aplica os dois segmentos recomendados nesse item único, a confirmação lista os segmentos
   do `payload` e deixa marcar quais foram de fato aplicados, gerando um `AjusteCampanha` por segmento
   confirmado (mesmo `itemFilaId` nos dois). Mantém `AjusteCampanha.segmento` simples (uma dimensão
   por linha, decisão 3) sem perder granularidade quando o item empacota mais de uma recomendação.

**Forma resultante do modelo** (nomes de trabalho, redação final é da OpenSpec change):

```
AjusteCampanha {
  id, campanhaId, campanha Campanha,
  tipo (enum BUDGET | CPA_ALVO | LANCE_SEGMENTO),
  origem (enum FILA | MANUAL),
  itemFilaId (String? — referência solta a ItemFila, não única, 1-para-N),
  valorAnterior (Decimal?), valorNovo (Decimal?),
  segmento (dimensao GEO | DISPOSITIVO, valor string)?  // só quando tipo = LANCE_SEGMENTO
  motivo (String? @db.Text),  // opcional nos dois casos de origem
  data (DateTime),            // editável só quando origem = MANUAL; default now()
  createdAt DateTime @default(now())
}
```

Consultas por campanha ("qual foi o último ajuste de budget/CPA e quando") filtram por
`campanhaId` + `tipo`, ordenam por `data desc` — índice `@@index([campanhaId, tipo, data])` fica
para a escrita da migração, mesma categoria dos índices já deixados em aberto nos tickets 11/18.

Não desbloqueia nenhum ticket aberto diretamente (nenhum ticket aberto está bloqueado por este).
