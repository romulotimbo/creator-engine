# 09 — Gatilho de entrada em escala

Type: grilling
Status: closed
Blocked by: 07
Assignee: claude

## Question

O que faz uma campanha deixar de ser teste e virar escala? Hoje `StatusOperacional` tem
`TESTANDO | ESCALANDO | PAUSADO | ENCERRADO` e nada calcula a transição — ela é manual e sem critério.

Decidir:

- Qual a **condição de promoção**: número de vendas confirmadas, ROI acumulado acima de um corte,
  CPA real abaixo do `cpaAlvoBreakeven`, ou combinação?
- A promoção é **automática** (o sistema muda o status) ou é um **item de fila** que recomenda e o
  operador confirma? O charting travou "o sistema recomenda" para o Google Ads — vale também para
  mudança de estado interno?
- A transição é reversível? Uma campanha escalando que piora volta a TESTANDO ou vai direto a PAUSADO?
- O gatilho é da **Campanha** ou do **Produto**? Duas campanhas do mesmo produto podem estar em
  estados diferentes — confirmar que sim e que isso é coerente com `CONTEXT.md`.
- A partir da promoção, os gatilhos por gasto acumulado (ticket 07) **param de valer** e dão lugar
  aos de escala (ticket 10). Definir explicitamente esse corte.

## Resolution (26/08/2026)

Fechado por interview (`/grilling`). Forma final da regra:

1. **Condição de promoção: dupla, não single-metric.** Volume mínimo de evidência (nº de
   `VendaAfiliado` com `status = APROVADA` acima de um piso) **e** ROI acumulado acima de um corte de
   folga real sobre o breakeven (não apenas "CPA abaixo do alvo" — margem, não empate). Ambos os
   limiares moram em `LimiarGlobal` (mecanismo genérico do ticket 07), overridáveis por
   `ProdutoAfiliado.limiaresOverride`. `cpaReal < cpaAlvoBreakeven` isolado não é gate — fica
   subsumido pelo corte de ROI, são a mesma informação por ângulos diferentes. Isso deliberadamente
   difere da pré-condição de re-teste do ticket 08 ("1-3 vendas + ROI empatando ±10%"): re-teste
   aceita empate como sinal de "ainda vale continuar testando", escala exige folga real como sinal de
   "isso está pagando de verdade".
2. **Promoção nunca é automática — sempre item de fila.** Generaliza o precedente "o sistema
   recomenda, nunca escreve" do ticket 07 (que travou isso para escrita no Google Ads) para qualquer
   transição de estado interno relevante: a fila de decisão codificada é o mecanismo canônico de
   "decida agora", não um mecanismo exclusivo de ações externas. Motivo operacional concreto: nenhuma
   consequência prática de "ESCALANDO" (budget, lances) acontece automaticamente no Google Ads — o
   sistema mudar `status` sozinho deixaria o domínio dizendo "ESCALANDO" enquanto a campanha real
   ainda está configurada como teste. `Campanha.status` só muda quando o operador confirma o item.
3. **Transição TESTANDO → ESCALANDO é de mão única, não reversível.** Uma vez cruzado o gate
   (evidência de volume + margem de ROI), essa evidência não deixa de existir se o desempenho piorar
   depois — reabrir `TESTANDO` reativaria os gates de teto-por-comissão do ticket 07, que já foram
   satisfeitos e não fazem sentido re-litigar. Piora em `ESCALANDO` é `Diagnóstico de Campanha`
   keep/kill (`Falha de Execução` ou `Falha de Mercado` num patamar de gasto mais alto), resolvido
   pelas regras de escala do ticket 10, e o único destino de saída por piora é `PAUSADO` ou
   `ENCERRADO` — nunca de volta a `TESTANDO`.
4. **Gatilho é por Campanha, nunca por Produto.** Confirma `CONTEXT.md`: `Campanha` é o grão do
   diagnóstico keep/kill, `Viabilidade do Produto` é leitura agregada, não estado armazenado. Duas
   campanhas do mesmo produto podem estar em `status` diferentes ao mesmo tempo — não é inconsistência
   a resolver, é o comportamento esperado. **`ProdutoAfiliado.statusOperacional` é deprecado por este
   ticket**: nenhuma regra o escreve mais (mesmo padrão do `criterioPausa`/`criterioEscala` do ticket
   07 e do `keywordsPrioritarias` do ticket 05 — sem drop de coluna). Se "viabilidade do produto"
   precisar de leitura, é projeção calculada em runtime sobre `Campanha[].status`, nunca coluna.
5. **Corte teste↔escala: o próprio campo `Campanha.status`, binário e mecânico.** Regras do ticket 07
   só avaliam campanhas com `status = TESTANDO`; regras do ticket 10 só avaliam `status = ESCALANDO`.
   Sem período híbrido — a troca é instantânea no momento da confirmação do operador. Consequência
   aceita explicitamente: entre a campanha satisfazer os critérios de promoção e o operador confirmar
   o item de fila, ela continua `TESTANDO` e os gatilhos do ticket 07 seguem ativos nesse intervalo —
   podem gerar um segundo item de fila em paralelo (ex.: teto de faixa alcançado). Não é condição de
   corrida a suprimir; são dois itens legítimos e independentes, o operador vê os dois.

Desbloqueia o ticket 10.
