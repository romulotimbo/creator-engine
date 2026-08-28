## ADDED Requirements

### Requirement: Teto de teste por faixa de comissão
O sistema SHALL calcular o teto de gasto de uma campanha `TESTANDO` como um percentual acumulativo por faixa de comissão: 100% do valor da comissão para comissões até US$100; US$100 fixo para comissões acima disso. Todos os valores SHALL ser tratados em USD, sem conversão de moeda, independente de `Campanha.moeda`. Quando `Campanha.gastoTotalAcumulado` atingir o teto, o sistema SHALL gerar um `ItemFila` de diagnóstico.

#### Scenario: Comissão dentro da faixa uniforme
- **WHEN** a comissão do produto é US$60 e o gasto acumulado da campanha chega a US$60
- **THEN** o sistema gera um `ItemFila` de teto de teste para aquela campanha

#### Scenario: Comissão acima de US$100
- **WHEN** a comissão do produto é US$250 e o gasto acumulado chega a US$100
- **THEN** o sistema gera o `ItemFila` de teto (teto fixo de US$100, não 100% da comissão)

### Requirement: Gate de checkout crescente e herdado por faixa
O sistema SHALL exigir um número mínimo de checkouts (`checkoutsCount` acumulado) que cresce por faixa de comissão (0 → 1 → 2, herdando o mínimo da faixa anterior). A ausência de checkout suficiente NÃO SHALL criar um segundo teto de gasto mais baixo — SHALL ser anexada como evidência ao `ItemFila` do teto.

#### Scenario: Teto atingido sem checkout mínimo
- **WHEN** o gasto acumulado atinge o teto da faixa mas `checkoutsCount` está abaixo do mínimo daquela faixa
- **THEN** o `ItemFila` de teto é gerado normalmente, com a ausência de checkout suficiente registrada como evidência no item

### Requirement: Alerta de faixa acima de US$100
O sistema SHALL gerar um `ItemFila` de alerta (separado do teto final) quando a comissão for maior que US$100 e o número de checkouts estiver entre 50% e 60% do gate daquela faixa.

#### Scenario: Alerta antes do teto
- **WHEN** comissão = US$300 e checkouts acumulados atingem 55% do gate da faixa
- **THEN** o sistema gera um `ItemFila` de alerta, distinto e mais cedo que o item de teto final

### Requirement: Re-teste — árvore única de pré-condição e decisão por Trends
Quando uma campanha `TESTANDO` atinge o teto de gasto **e** tem entre 1 e 3 vendas confirmadas (`VendaAfiliado.status = APROVADA`, nível Campanha) **e** o ROI está empatando (±10% do breakeven), o sistema SHALL consultar a série de Trends mais recente daquele produto/oferta para decidir entre: estender o teto em 1 comissão (default, ou 1-2 comissões se Trends estável/crescendo) ou recomendar reduzir CPA alvo em 5-10% sem estender (Trends em queda). Fora dessa pré-condição composta, nenhuma decisão de re-teste SHALL ser gerada.

#### Scenario: Pré-condição completa, Trends estável
- **WHEN** teto batido, 2 vendas `APROVADA`, ROI dentro de ±10% do breakeven, e a série de Trends do produto está estável
- **THEN** o sistema gera um `ItemFila` recomendando extensão de 1-2 comissões

#### Scenario: Pré-condição completa, Trends em queda
- **WHEN** as mesmas condições de pré-condição, mas Trends em queda
- **THEN** o sistema gera um `ItemFila` recomendando reduzir CPA alvo em 5-10%, sem estender o teto

#### Scenario: Pré-condição incompleta
- **WHEN** o teto foi batido mas há 0 vendas confirmadas ou o ROI está fora da faixa de empate
- **THEN** o sistema não gera item de re-teste — o item de teto padrão segue valendo

### Requirement: Fôlego financeiro como teto absoluto adicional
O sistema SHALL aplicar um teto absoluto em dólar por cima de qualquer extensão em comissões, valendo o menor entre os dois: US$200 para perfil financeiro "inicial", US$600 para "caixa formado". O acumulado SHALL ser somado por produto entre campanhas ligadas via `campanhaOrigemId`, sem resetar ao trocar de conta de tráfego. A promoção de perfil (inicial → caixa formado) SHALL ser manual, sem gerar item de fila.

#### Scenario: Extensão em comissão excede o fôlego
- **WHEN** a extensão calculada em comissões ultrapassaria US$250 mas o perfil financeiro do produto é "inicial" (teto US$200)
- **THEN** o sistema limita a extensão recomendada a US$200

### Requirement: Gatilho de entrada em escala
O sistema SHALL promover uma campanha de `TESTANDO` para `ESCALANDO` apenas via confirmação manual de um `ItemFila` — nunca automaticamente — quando o volume mínimo de vendas confirmadas e o ROI acumulado com folga real sobre breakeven (não empate) forem atingidos. `cpaReal < cpaAlvoBreakeven` isoladamente NÃO SHALL ser gate — fica subsumido no corte de ROI. A transição SHALL ser por Campanha, nunca por Produto, e SHALL ser mão única: uma vez `ESCALANDO`, a campanha só sai por `PAUSADO` ou `ENCERRADO`, nunca de volta a `TESTANDO`.

#### Scenario: Condições de escala atingidas
- **WHEN** uma campanha `TESTANDO` atinge o volume mínimo de vendas e ROI com folga real sobre breakeven
- **THEN** o sistema gera um `ItemFila` de promoção a `ESCALANDO`, que só muda o status após confirmação do operador

#### Scenario: Tentativa de reverter ESCALANDO para TESTANDO
- **WHEN** qualquer fluxo tenta setar `Campanha.status = TESTANDO` numa campanha atualmente `ESCALANDO`
- **THEN** o sistema rejeita a transição — só `PAUSADO`/`ENCERRADO` são destinos válidos a partir de `ESCALANDO`

### Requirement: Mensuração de escala mensal
Para campanhas `ESCALANDO`, o sistema SHALL usar o mês calendário como janela canônica de decisão de continuidade (semana é leitura auxiliar, nunca gera item de fila própria). Quando o ROI mensal ficar abaixo do limiar (`LimiarGlobal`, binário, sem zona intermediária), o sistema SHALL gerar um `ItemFila` de diagnóstico (keep/kill) — nunca um recuo automático.

#### Scenario: ROI mensal abaixo do limiar
- **WHEN** o ROI acumulado do mês calendário de uma campanha `ESCALANDO` fica abaixo do limiar de continuidade
- **THEN** o sistema gera um `ItemFila` de diagnóstico keep/kill — não altera `Campanha.status` sozinho

### Requirement: Alerta de ritmo de entrega
O sistema SHALL gerar um alerta informativo (não item de fila que exige ação) comparando gasto do dia × budget diário para campanhas `ESCALANDO`. `alertaOrcamentoEstourado` não se aplica em `ESCALANDO` (não há teto de teste nessa fase).

#### Scenario: Ritmo acima do esperado
- **WHEN** o gasto do dia de uma campanha `ESCALANDO` excede o budget diário esperado
- **THEN** o sistema exibe um alerta informativo, sem gerar `ItemFila` de ação obrigatória

### Requirement: Regra de aumento/recuo 5-10% e janela de reação a queda
O sistema SHALL gerar um único `ItemFila` combinando ajuste de budget e CPA (regra dos 5-10%) quando aplicável. Para recuo, o sistema SHALL usar uma janela de 3 dias pré/pós o último ajuste (não o dia isolado, não o mês), disparando quando o ROI virar negativo nessa janela; o item SHALL ficar escopado ao ajuste específico e SHALL pausar a sugestão de aumento enquanto estiver ativo.

#### Scenario: ROI vira negativo na janela pós-ajuste
- **WHEN** o ROI da campanha vira negativo dentro dos 3 dias após um `AjusteCampanha` de budget
- **THEN** o sistema gera um `ItemFila` de recuo escopado àquele ajuste e suspende qualquer sugestão de aumento para a campanha enquanto esse item estiver aberto
