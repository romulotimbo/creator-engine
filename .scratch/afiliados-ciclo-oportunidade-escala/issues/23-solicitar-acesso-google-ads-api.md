# 23 — Solicitar Basic Access + permissible use no Google Ads API

Type: task
Status: open
Blocked by: —
Assignee: claude

## Passo 0 CONCLUÍDO (23/08/2026) — resultado: caminho liberado

Export real da UI em `.scratch/fixtures/keyword-stats-2026-08-23.tsv` (4 termos, geo US).

**A conta vê números exatos, não faixas.** O termo de controle `weight loss` voltou `135000`.
A incerteza que podia invalidar o estágio inteiro está resolvida a favor — **vale pedir o Basic
Access.** Os passos abaixo seguem válidos.

Achados colaterais registrados nos tickets 06 (piso de detecção de ~20%, casos-limite, divergência
rede×busca), 22 (12 meses e não 4 anos) e 14 (formato UTF-16/TSV do export).

## Passos 1-3 CONCLUÍDOS (24/08/2026) — pedido enviado, aguardando aprovação

Developer token localizado na conta MCC; Basic Access solicitado; permissible use declarada como
**"Researching keywords and recommendations"** (não "Reporting" — condição crítica do passo 3).

**Status: PENDENTE.** Nível concedido e limites de operação efetivos ainda não retornaram — a
aprovação é julgamento humano da Google, sem prazo garantido. Ticket **permanece aberto e
reivindicado**, propositalmente: fechá-lo agora destravaria o ticket 17 na fronteira do mapa, mas o
17 só pode puxar dado real depois do acesso **concedido**, não só solicitado. Retomar quando a
resposta chegar — registrar nível concedido, permissible use concedida (confirmar que bateu com o
pedido) e limites efetivos, então rodar a "Verificação obrigatória" abaixo antes de fechar.

## Question

Nada a decidir — trabalho manual que destrava o único caminho gratuito para volume de busca. É o
gargalo de cronograma do estágio de oportunidade inteiro: **zero risco técnico, 100% risco de
aprovação**, e as duas aprovações são julgamentos humanos da Google que levam dias.

Por isso deve ser iniciado **cedo**, em paralelo com as decisões de modelagem — não depois delas.

## Passo 0 — calibrar pela UI ANTES de aplicar (grátis, ~10 min)

A UI do Keyword Planner já está acessível na conta do operador e aceita **upload de lista de
keywords por CSV** e **download dos resultados**
(<https://support.google.com/google-ads/answer/7337243>). Isso resolve, sem esperar aprovação
nenhuma, a incerteza que pode invalidar o estágio inteiro:

**A conta vê números exatos ou faixas do tipo "1K–10K"?** Se vir faixas, nenhuma regra de curva
ascendente funciona sobre esse dado, e o pedido de Basic Access não vale a pena — o ticket 22 muda
de forma e a decisão passa a ser Bing ou fornecedor pago.

Colar os três termos de teste do ticket 17 e olhar o formato do número. É o teste mais barato do
mapa inteiro e ele fica na frente de tudo.

**Incluir um termo de controle de volume inequívoco** (ex.: `weight loss`) junto com os três. Sem
ele o teste é ambíguo: termo de marca de oferta obscura pode mostrar faixa por ter volume
genuinamente baixo, não por limitação da conta. Se o termo de controle também vier em faixa, aí a
limitação é da conta e a conclusão é definitiva.

A UI serve também como **ponte de curto prazo** enquanto a aprovação não sai — manual, não
automatizável, mas produz dado real para modelar contra.

## Passos do pedido (HITL — o agente não preenche formulário nem aceita termos)

1. Localizar/criar o developer token na conta MCC do Google Ads.
2. **Solicitar Basic Access.** Explorer Access lista `KeywordPlanIdeaService` em "Restricted Services
   and Methods" — o token, não a conta, é o que está travado. Gasto real na conta não ajuda.
3. **Crítico: declarar a permissible use correta.** O token precisa de
   **"Researching keywords and recommendations"** para tocar o `KeywordPlanIdeaService`. Se a
   aplicação for aprovada como "Reporting", o serviço continua fechado e é preciso reaplicar.
   O texto da aplicação deve descrever pesquisa de keywords, não relatório de performance.
4. Registrar na resolução: data do pedido, nível concedido, permissible use concedida, e os limites
   de operações efetivos.

## Verificação obrigatória assim que o acesso sair

**Comparar UI e API nas mesmas keywords, na mesma conta.** A pesquisa do ticket 21 deixou como
**NÃO CONFIRMADO** se contas de baixo gasto recebem **faixas** ("1K–10K") em vez de números exatos
pela API — a regra existe só em threads de comunidade, sem fonte primária da Google. Se receberem
faixas, **nenhuma regra de curva ascendente funciona** sobre esse dado, e o ticket 22 muda de forma.

Aproveitar a mesma sessão para:

- Chamar `GenerateKeywordHistoricalMetrics` com **`include_adult_keywords: true`** (o default é
  `false` e come termos de nutra silenciosamente) e salvar o JSON como fixture.
- Resolver a contradição da doc sobre profundidade histórica (`HistoricalMetricsOptions` diz 4 anos,
  a descrição do campo diz 12 meses) — a resposta real decide.
- Confirmar que `monthly_search_volumes[]` volta com a série completa, que é a compensação pela
  ausência de índice relativo.

Termos e geos de teste propostos no ticket 17.
