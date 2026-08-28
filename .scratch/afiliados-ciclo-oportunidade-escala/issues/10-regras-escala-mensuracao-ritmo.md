# 10 — Regras de escala: mensuração semanal/mensal e ritmo de aumento

Type: grilling
Status: closed
Blocked by: 09
Assignee: claude

## Question

Escala inverte a lógica do teste. Variação diária **não decide nada** — uma campanha escalada pode
começar o dia muito negativa e terminar positiva. A decisão é manual, em janela **semanal e mensal**,
e a pergunta é: *"estou ganhando muito mais do que perdendo considerando o mês inteiro?"*.
O **acompanhamento de gastos**, porém, é frequente.

Regras de ritmo como enunciadas:

- Antes de subir verba, **otimizar segmentos** (ver ticket 11).
- **Regra dos 5 a 10%**: subir orçamento diário **e** CPA desejado em 5 a 10% a cada 24h
  (ou cerca de US$2 a US$3 por dia).
- Ao subir o CPA, **se a campanha perder margem após um aumento, recuar imediatamente**.

Decidir:

- Como o sistema apresenta a leitura mensal/semanal sem sugerir ação diária: qual a janela canônica,
  e o que a fila mostra (ou deixa de mostrar) entre fechamentos.
- **"Ganhando muito mais do que perdendo"** precisa de um número — qual é o corte de continuidade?
- O acompanhamento frequente de gastos gera **alerta** de quê, exatamente, se não gera decisão?
  (Estouro de orçamento do período já existe: `alertaOrcamentoEstourado` em `rollups.ts`.)
- A regra dos 5 a 10%: o sistema **sugere o próximo aumento** (valor e data) na fila? Como sabe que
  passaram 24h do último aumento — depende do registro de ajustes (ticket 12).
- **"Recuar imediatamente"**: com que janela se mede "perdeu margem após o aumento", dado que a
  variação diária foi declarada não-determinante? Esta é a tensão central deste ticket.

## Nota herdada do ticket 02

O teto de "acompanhamento frequente de gastos" depende de uma ambiguidade não resolvida na
documentação do Google: a Central de Ajuda lista agendamento apenas como once/daily/weekly/monthly,
enquanto duas soluções oficiais em developers.google.com mandam agendar **Hourly**. Se horário não
existir na UI, o acompanhamento tem teto **diário** — e a regra dos 5–10% "a cada 24h" passa a ter
resolução igual à do próprio dado, sem folga para detectar perda de margem dentro do ciclo.
Confirmar na UI da conta antes de fechar este ticket.

## Resolution (26/08/2026)

Fechado por interview (`/grilling`). Forma final da regra:

1. **Janela canônica de decisão: mês calendário, não semana e não rolling 30 dias.** A semana é
   leitura auxiliar de tendência dentro do mês — nunca dispara item de fila própria. Só o fechamento
   do mês (dia 1 ao fim do mês) produz o veredito "continuar / diagnosticar". Mês corrente (não
   rolling) porque casa com o cron mensal que `google_ads/status.actual_data` já usa (ticket 01) e é
   mais legível na fila ("fechamento de agosto"). Campanhas que entram em `ESCALANDO` no meio do mês
   têm primeiro fechamento parcial — ruído de borda aceito, sem regra especial.
2. **Corte de continuidade: ROI mensal acumulado, via `LimiarGlobal`, binário.** Métrica é
   `(receita − gasto) / gasto` do mês fechado — não lucro em dólar absoluto (não comparável entre
   campanhas de porte diferente). Novo `LimiarGlobal` (mesmo mecanismo genérico do ticket 07/09,
   ex.: chave `escalaRoiMinimoMensal`), overridável por produto — valor concreto não é decisão de
   modelagem, fica para configuração. Regra é binária, sem zona intermediária "amarela": ROI ≥ limiar
   → nada acontece, ritmo de aumento (item 4) segue normal; ROI < limiar → item de fila de
   **diagnóstico** (vocabulário keep/kill do `CONTEXT.md`: Falha de Execução vs Falha de Mercado),
   nunca um "recuar" automático — generaliza o precedente do ticket 09 de que toda transição de
   estado relevante é item de fila, não mecanismo automático.
3. **Alerta de acompanhamento de gastos: ritmo de entrega, não teto.** `alertaOrcamentoEstourado`
   (gasto acumulado × teto do período) é específico do teste (que tem teto por comissão, ticket 07) e
   não se aplica em `ESCALANDO` — escala não tem teto de gasto, o objetivo é subir. Substituto:
   comparar **gasto do dia** (última linha de `CampanhaSnapshot`) contra o `budgetDiarioDefinido`
   vigente — faixas abaixo (campanha parou de entregar) e acima (overdelivery que o próprio Google
   Ads permite) a calibrar na implementação. **Puramente informativo, nunca gera item de fila** — é o
   "acompanhamento frequente sem virar decisão" que o ticket pede, com a decisão real travada no
   item 2.
4. **Regra dos 5–10%: item de fila único, cobrindo budget diário e CPA alvo juntos.** Sugere um
   valor dentro da banda 5–10% para os dois simultaneamente (o ticket já os junta — "subir orçamento
   diário e CPA desejado"). Condição de disparo (≥24h desde o último ajuste registrado daquela
   campanha, ou desde a entrada em escala se ainda não houve ajuste) **não é resolvida aqui** — é
   requisito herdado pelo ticket 12 (só computável quando `AjusteCampanha` existir; nota adicionada
   lá). Pré-condição "otimizar segmentos antes" (ticket 11) não é gate mecânico agora — vira lembrete
   textual no item até o ticket 11 definir o que "otimizado" significa; passa a gate real só depois.
5. **"Recuar imediatamente" — a tensão central: janela curta ancorada ao evento, não ao dia isolado
   nem ao mês.** Resolvida separando *o que decide* de *quando*: não é "olhar o dia decide" (rejeitado
   de propósito), é uma janela de **3 dias corridos após o ajuste**, comparada contra os 3 dias
   imediatamente anteriores — curta o bastante pra ser "imediata" frente ao ciclo mensal, longa o
   bastante pra absorver ruído diário e o atraso checkout→venda (propriedade observada, não publicada
   por rede — ticket 03). Gatilho: **ROI da janela pós-ajuste vira negativo enquanto a janela
   pré-ajuste não era negativa** — vira prejuízo, não mera oscilação de margem. Ação é item de fila
   **escopado ao ajuste específico** ("desfazer o aumento de [data]"), diferente do diagnóstico geral
   do item 2. Enquanto ativo, a sugestão do item 4 pausa. Mesma dependência para frente do item 4:
   ancora no `data` do `AjusteCampanha` que o ticket 12 vai desenhar.
6. **Nota herdada do ticket 02 (ambiguidade de agendamento horário): resolvida como moot.** Nenhuma
   regra deste ticket precisa de granularidade intra-dia — item 1 usa mês, item 3 usa dia, item 5 usa
   3 dias. O piso de grão diário (certo em qualquer leitura da doc do Google) já basta para tudo aqui.
   Não bloqueia o fechamento; segue relevante só se um ticket futuro precisar de grão horário.

Desbloqueia totalmente o ticket 18 (que também já tinha 06, 07 e 08 fechados).
