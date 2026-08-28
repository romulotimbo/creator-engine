# 07 — Regras de teste inicial: teto por faixa de comissão e alerta de checkout

Type: grilling
Status: closed
Blocked by: 04
Assignee: claude

## Question

Codificar as regras de teste dadas no charting. Elas são por **gasto acumulado, nunca por tempo**,
e os tetos são **múltiplos de comissão** derivados em runtime, não colunas.

Regras como enunciadas:

- Comissão até US$40 → teto de até **1 comissão**.
- Comissão até US$60 → buscar **ao menos 1 checkout** antes de decidir parar.
- Comissão até US$80 → teste pode ir até **100% da comissão**, mas só se houver **2 checkouts ou mais**.
- Comissão acima de US$100 (high ticket) → teto travado em **US$100**.
- Alerta (comissão acima de US$100): o primeiro checkout deve aparecer entre **50% e 60%** da comissão
  gasta; atingir essa faixa sem checkout relevante é sinal de baixo desempenho.

Buracos declarados a resolver:

- **Faixa 80–100 não tem regra.** A regra salta de "até 80" para "acima de 100".
- **"Até US$60" não declara teto** — diz o que buscar, não onde parar.
- As faixas são cumulativas ou excludentes? "Até 80 pode ir a 100% da comissão" — uma comissão de
  US$75 tem teto US$75, mas a faixa "até 60" já exigia checkout: as condições se somam?
- O que acontece quando a condição de checkout **não** é satisfeita — para imediatamente, ou para
  em teto menor?
- Moeda: comissões vêm em USD (`PortfolioConfig.currency`), campanhas têm `moeda` própria. Onde a
  conversão acontece.

Decidir também **onde os limiares moram**: padrões globais (config nova? estender `PortfolioConfig`?)
com override por `ProdutoAfiliado`, e o que acontece com `criterioPausa` (texto livre hoje).

## Resolution (26/08/2026)

Fechado por interview (`/grilling`). Forma final da regra:

1. **Faixas são cumulativas, não excludentes.** O teto de gasto é lido pela faixa correspondente à
   comissão do produto, mas o **gate de checkout** cresce faixa a faixa e nunca "reseta" — uma
   comissão na faixa 80–100 herda o gate da faixa 60–80 em vez de ficar sem regra.
2. **Teto de gasto uniforme: 100% da comissão** em toda faixa ≤ US$100. O texto original só declara
   "100%" duas vezes (faixa ≤40 sem condição, faixa 60–80 com condição) e nunca um valor
   intermediário — não há base pra inventar um teto fracionário pra faixa 40–60. Só a faixa >US$100
   quebra o padrão percentual: teto fixo em **US$100**.
3. **Gate de checkout por faixa** (resolve os dois buracos "80–100 sem regra" e "até 60 sem teto" de
   uma vez, por herança cumulativa):

   | Faixa | Teto | Checkouts exigidos |
   |---|---|---|
   | ≤ US$40 | 100% comissão | 0 (sem gate) |
   | US$40–60 | 100% comissão | ≥ 1 |
   | US$60–80 | 100% comissão | ≥ 2 |
   | US$80–100 | 100% comissão | ≥ 2 (herdado, sem número próprio declarado) |
   | > US$100 | US$100 fixo | ver item 5 (alerta) |

4. **Ausência de checkout não bloqueia gasto até o teto.** Não existe segundo teto mais baixo, não
   numerado nas regras originais. Ao bater o teto da faixa, o item cai na **fila de decisão
   codificada** (mecanismo canônico do mapa); a evidência de checkout (presente/ausente até aquele
   ponto) entra como contexto que reforça a recomendação — kill sem evidência, keep/reteste com
   evidência — mas quem decide continua sendo o operador ("o sistema recomenda, nunca escreve").
5. **O alerta da faixa >US$100 é um gatilho de fila próprio**, independente do gatilho no teto final
   de US$100. Cruzar 50–60% do teto gasto sem checkout dispara seu próprio item, mais cedo — dinheiro
   mais caro por teste em high-ticket justifica um ponto de decisão antes de queimar a comissão
   inteira. Não é apenas um campo de contexto lido no teto final.
6. **Moeda: tudo em USD, sem conversão.** Pressuposto operacional explícito (não um gate no código):
   as contas de tráfego usadas neste fluxo são faturadas em USD. `Campanha.moeda` não é lido por esta
   regra; se um dia existir campanha não-USD, ela fica fora do escopo desta regra por decisão de
   conta, não por erro silencioso.
7. **Limiares moram em mecanismo genérico reutilizável, não bespoke.** Tabela `LimiarGlobal` (`chave`
   única + `valor Json`) guarda os defaults globais de **qualquer** limiar codificado do mapa — não só
   os deste ticket, também serve os tickets futuros de limiar (08, 09, 10). Override por produto via
   `ProdutoAfiliado.limiaresOverride Json?` (mesmas chaves, sobrepõe o default quando presente).
   Decisão deliberada de não estender `PortfolioConfig` (conflaria capital total disponível com
   limiares de regra) nem criar um modelo tipado bespoke por ticket (repetiria a mesma decisão de
   arquitetura quatro vezes).
8. **`criterioPausa`/`criterioEscala` sobrevivem como anotação humana livre**, fora do caminho de
   qualquer regra codificada — diferente do precedente do ticket 05 (`keywordsPrioritarias`
   deprecated), porque texto livre nunca competiu de verdade com uma regra codificada, competia com a
   ausência de uma. Não deprecados, não removidos; ficam como espaço legítimo pro operador anotar
   nuance que a regra não captura.

Desbloqueia o ticket 09.
