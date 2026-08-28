# 22 — O híbrido sobrevive? Qual sinal de demanda o Radar usa de fato

Type: grilling
Status: closed
Blocked by: —

## Question

O charting travou "demanda de busca é híbrida: volume absoluto dá escala, índice relativo dá timing".
A pesquisa do ticket 21 mostrou que **a metade do timing não tem caminho gratuito oficial**. Antes de
modelar a série (ticket 05) é preciso decidir com que sinal o sistema realmente vai contar.

### O que está sobre a mesa

| Fonte | Entrega | Custo | Barreira |
|---|---|---|---|
| **Google Keyword Planner** (API) | Volume absoluto mensal + **4 anos de série** + CPC/bid range | Zero | **Duas aprovações humanas** na Google: Basic Access **e** permissible use "Researching keywords and recommendations" |
| **Google Trends API oficial** | Índice, escala consistente entre requisições | Indeterminado | Alpha por aplicação; docs em 404; sem sinal de progresso há ~13 meses |
| **Google Trends não-oficial** | Índice 0–100, diário/semanal | Zero | `pytrends` arquivado 2025-04-17; raspagem, 429, bloqueio de IP, risco de TOS |
| **Bing Webmaster Tools** (`GetKeywordStats`) | **Série temporal de impressões por geo**, sem `siteUrl` | Zero | Só exige site verificado — operador tem `romulohub.cloud` e `zernio.com` |
| **Fornecedor pago** | Tudo | ~US$18/mês, mín. US$50 | Descartado por decisão do operador |

### As decisões

- **O híbrido continua sendo requisito, ou colapsa?** A descoberta de que
  `monthly_search_volumes[]` traz **4 anos de série mensal na mesma chamada** enfraquece o argumento
  original: o volume absoluto deixa de ser um ponto e passa a ser uma curva. O que se perde sem o
  índice relativo é **resolução sub-mensal** — saber que subiu *esta semana*. Vale o custo de
  perseguir isso?
- **Suas regras precisam mesmo de resolução diária?** Duas dependem de Trends: a de re-teste
  (estável/crescendo estende, queda reduz CPA 5–10%) e o acompanhamento diário de campanha viva.
  A primeira é sobre tendência de mercado — parece sobreviver a resolução mensal. A segunda foi
  sugestão minha e nunca teve valor comprovado. Decidir cada uma.
- **Bing entra como proxy de timing?** Série temporal de impressões, grátis, sem fila. Motor errado —
  mas para *forma de curva* em nutra de consumo, a correlação Bing↔Google é plausível (não medida).
  Opções: (a) ignorar; (b) usar só como sinal de aceleração, nunca como volume; (c) usar e medir a
  correlação contra o Keyword Planner ao longo do tempo, promovendo ou descartando com dado próprio.
- **E se a aprovação da Google não sair?** Os dois julgamentos são gratuitos mas não são garantidos,
  e a aplicação descreve o uso — "Researching keywords" precisa estar no texto. Definir o plano B:
  Bing sozinho, ou reabrir a hipótese de fornecedor pago com outro fornecedor que tenha free tier.
- **O modelo aceita fonte ausente?** Enquanto a aprovação não sai, o sistema roda sem série alguma.
  A série é opcional no modelo (Radar funciona sem ela, degradado) ou é pré-requisito de operar?

### Atualização com dado real (23/08/2026) — o teste de calibração foi feito

Fixture: `.scratch/fixtures/keyword-stats-2026-08-23.tsv`.

- ✅ **A conta vê números exatos, não faixas.** O termo de controle (`weight loss`) voltou como
  `135000`, não `100K–1M`. **O caminho do Keyword Planner está liberado** e o pedido de Basic Access
  vale a pena.
- ⚠️ **Mas o export traz 12 meses, não 4 anos.** Exatamente 12 colunas `Searches: Aug 2025` …
  `Searches: Jul 2026`. Isso **enfraquece a compensação** com que este ticket contava: o argumento
  "não preciso de índice relativo porque o volume absoluto já traz 4 anos de curva" cai para 1 ano.
  **Segue em aberto se a API entrega mais que a UI** — `HistoricalMetricsOptions` promete 4 anos, e a
  contradição da documentação não está resolvida. Só a chamada real (ticket 23) decide.
- ⚠️ **Piso de detecção de ~20%.** Os valores são quantizados numa escada de razão ~1,22 (ver
  ticket 06). Com 12 meses de série e degraus de 20%, o poder de detecção da regra é bem menor do que
  este ticket assumia ao pesar "abrir mão do índice relativo".
- ✅ **Lag de ~1 mês confirmado** — hoje é 23/08/2026 e o mês mais recente é jul/2026.
- ✅ **CPC/competição vêm juntos e de graça**, aposentando o preenchimento manual do Radar.

**O que isso faz com a decisão deste ticket:** a opção "só volume absoluto, sem índice relativo"
ficou mais fraca do que parecia — 12 meses de série quantizada em degraus de 20% detecta tendência
grossa, não timing. Isso empurra o peso de volta para o **Bing** como proxy de aceleração (série
temporal, sem fila, grátis) ou para reconsiderar um fornecedor pago com free tier.

### Restrições que valem qualquer que seja a escolha

- **`include_adult_keywords` default `false`** — vai comer termos de nutra silenciosamente. Se o
  Keyword Planner for adotado, isso é obrigatório no contrato de ingestão (ticket 14).
- **Contradição na doc da Google** sobre profundidade histórica (4 anos vs 12 meses) — não resolvida.
- **NÃO CONFIRMADO e potencialmente fatal:** se contas de baixo gasto recebem **faixas** ("1K–10K")
  em vez de números pela API. Se receberem, nenhuma regra de curva funciona sobre esse dado. Só se
  resolve comparando UI e API nas mesmas keywords, com o acesso já aprovado.

## Decision (24/08/2026)

Fechado por interview (`/grilling`). As cinco perguntas, na ordem do ticket:

1. **O híbrido original colapsa.** "Volume absoluto + índice relativo 0–100 do Google" não é mais
   um trade-off a pesar — a metade do índice não tem caminho oficial viável (Trends API alpha há 13
   meses; `pytrends` arquivado). Volume absoluto (Keyword Planner) vira sinal primário de escala **e**
   de tendência grosseira (a série mensal já é uma curva, mesmo quantizada em degraus de ~20%).
2. **Regra de re-teste sobrevive em base mensal** (é leitura de tendência de mercado, coerente com o
   resto do mapa: gatilhos por gasto acumulado, escala decidida em janela semanal/mensal). **Regra de
   acompanhamento diário de campanha viva é descartada** — nunca teve valor comprovado e não há hoje
   sinal diário confiável para sustentá-la.
3. **Bing entra como opção (c) do ticket**: usar e medir correlação ao longo do tempo, não confiar
   cegamente. Operacionalmente, isso significa **ingerir e persistir a série do Bing desde já**
   (`fonte=BING`, `unidade=IMPRESSOES`, nunca confundida com volume do Google), **sem nenhuma regra ou
   score do Radar consumindo esse dado ainda** — existe só para acumular histórico que permita medir
   a correlação Bing↔Google no futuro (item novo em "Not yet specified" do mapa).
4. **Plano B se a aprovação da Google falhar: Bing (já sendo coletado) vira a série automatizada
   única**, complementado por export manual da UI do Keyword Planner (billing já cadastrado, sem
   aprovação) como calibração pontual, não como pipeline. **Fornecedor pago não é reaberto** — a
   rejeição de DataForSEO é tratada como decisão geral sobre fornecedor pago, não específica daquele
   fornecedor; reabrir isso exigiria um ticket novo com evidência real de que Bing+manual não bastou.
5. **Série é opcional no modelo.** O Radar opera sem ela, degradado: o componente de demanda de
   busca fica fora do `scoreBreakdown` (ou entra com confiança marcada) quando não há dado, em vez de
   bloquear a avaliação da oferta. O modelo precisa de um **terceiro estado explícito** — "sem dado"
   ≠ "demanda zero" (achado do ticket 06, termo `nerve pain supplement` voltou sem nada).

**Desbloqueia o ticket 05** (modelo de domínio Termo/série) e, por consequência, o 06. Consequências
diretas para o 05: série guarda `fonte` (`GOOGLE_KEYWORD_PLANNER` | `BING`) e `unidade` (`ABSOLUTO` |
`IMPRESSOES`) explícitos, nunca um índice 0–100 genérico; e o schema precisa do terceiro estado
sem-dado (`null`/ausência de linha ≠ linha com valor `0`).
