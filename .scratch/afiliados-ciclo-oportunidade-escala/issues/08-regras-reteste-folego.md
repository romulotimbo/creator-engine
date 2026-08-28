# 08 — Regras de re-teste e perfil de fôlego financeiro

Type: grilling
Status: closed
Blocked by: 04
Assignee: claude

## Question

Quando o produto **já vendeu e parou**, o contexto muda: não se descarta, re-testa. Codificar.

Regras como enunciadas:

- **1 a 3 vendas** → volume baixo demais para julgar; testar **mais 1 comissão**.
- **Trends estável ou crescendo** com campanha empatando → estender re-teste por **mais 1 a 2 comissões**.
- **Trends em queda** → não parar; **reduzir o CPA alvo em 5% a 10%** para aproveitar a cauda final
  antes da saturação.
- **Fôlego financeiro**: perfil *inicial* tolera cerca de **US$200** extras de re-teste; perfil
  *caixa formado* tolera **mais US$400** e ganha a flexibilidade de **trocar a campanha de conta**
  para testar o leilão em outro histórico de dados.

Decidir:

- "Já vendeu" conta **vendas confirmadas** (`VendaAfiliado`) ou conversões-Ads? E vendas do **produto**
  ou da **campanha**? Nota: `CONTEXT.md` já separa Viabilidade do Produto de Diagnóstico de Campanha —
  a regra de re-teste vale para qual dos dois?
- **Onde mora o perfil de fôlego** — é global do operador. `PortfolioConfig` é singleton e já tem
  `totalAvailableCapital`; o perfil é campo novo ali, ou derivado do capital disponível?
- Quem promove o perfil de *inicial* para *caixa formado* — manual ou por regra sobre o caixa?
- "Empatando" precisa de definição numérica (faixa de ROI em torno de zero?).
- **Queda no Trends com redução de CPA alvo de 5 a 10%**: isso é uma recomendação na fila (o operador
  aplica no Google Ads e registra), coerente com "o sistema não escreve". Confirmar, e definir se o
  sistema sugere o valor exato ou a faixa.
- "Trocar a campanha de conta": pela linguagem de `CONTEXT.md`, isso cria uma **Campanha** nova sob o
  mesmo produto, não um produto novo. Confirmar e definir como o histórico se mantém ligado.

## Resolution (26/08/2026)

Fechado por interview (`/grilling`). Árvore de decisão completa:

### 1. "Já vendeu" — nível Campanha, não Produto

Conta **vendas confirmadas** (`VendaAfiliado`, não conversões-Ads), com `status IN (APROVADA,
PENDENTE)` — `CANCELADA`/`ESTORNADA` não contam. Nível de leitura é a **Campanha** (não o Produto
agregado), coerente com `CONTEXT.md`: esta regra é *Diagnóstico de Campanha*, não *Viabilidade do
Produto*. **Dependência formal (não bloqueante) do ticket 15**: `VendaAfiliado` ainda não tem
`campanhaId` hoje — a decisão vale, mas a contagem por campanha só é implementável depois que o 15
adicionar essa coluna.

### 2. "Trends" — não é o índice do Google Trends; é o nível de buscas dos termos, fonte livre

Correção de vocabulário importante: a palavra "Trends" no enunciado original **não significa** o
índice 0–100 do Google Trends especificamente. Significa o **nível de buscas dos termos do produto**,
que pode vir de qualquer ferramenta — Google Trends, Glimpse, SEMrush, Flowspy — e por ora é
**inserido manualmente** (a ingestão automática não tem caminho viável hoje, ticket 22, mas isso não
elimina a necessidade do dado). O modelo precisa suportar **duas formas de medição**: índice 0–100
(padrão Google, 100 = maior volume no período) e volume absoluto por período. Isso **amplia o modelo
`SerieTermo` do ticket 05** — ver nota de emenda abaixo.

A regra usa **qualquer uma das duas unidades, o que estiver disponível**, nunca misturando índice com
volume no mesmo cálculo — sempre compara contra o ponto anterior da **mesma fonte + mesma unidade**
(mesmo princípio de "índice só comparável com o passado do próprio termo" do ticket 06). A fonte é
sempre registrada, para rastreabilidade de qual ferramenta gerou cada leitura.

**Janela de comparação:** múltiplas janelas possíveis (7 dias, 30 dias, 3 meses, 6 meses, ano), lidas
por **prioridade de granularidade com fallback**: 7d → 30d → 3m → 6m → ano — usa a mais recente e
granular disponível, cai pra mais agregada na ausência da mais fina. A janela usada é **registrada na
recomendação** (mesmo padrão de `scoreBreakdown`).

**Limiar numérico:** queda ≤ **-10%**, estável entre **-10% e +10%**, crescendo ≥ **+10%** — piso mais
sensível que o ±40% do ticket 06 porque a decisão aqui é mais barata (estender teste ou ajustar CPA de
uma campanha já rodando) do que a decisão do ticket 06 (deixar uma oferta nova entrar na fila).

### 3. "Empatando" — ROI acumulado da campanha entre -10% e +10%

Mesma régua de ±10% usada para Trends, por consistência. Lido sobre o **acumulado da campanha até o
momento em que o teto é batido** (não um dia isolado), coerente com o resto do mapa (gatilhos por
gasto acumulado, nunca por tempo).

### 4. Árvore de decisão completa

**Pré-condição de entrada (vale para a árvore inteira):** Campanha bate seu teto de gasto (ticket 07)
**E** 1-3 vendas confirmadas **E** ROI empatando (±10%). Fora dessa zona — ROI claramente negativo,
mesmo com poucas vendas — a árvore de re-teste **não se aplica**; cai direto no kill normal do ticket
07 (fila de decisão, sem re-teste). "Queda no Trends" **não** é suficiente sozinha para acionar
re-teste numa campanha claramente perdendo dinheiro — dois sinais ruins não geram uma segunda chance.

Dentro da zona:

- **Trends indisponível ou sem sinal favorável:** extensão default de **1 comissão**.
- **Trends estável ou crescendo:** extensão de **1 a 2 comissões** — substitui o default (não soma;
  é uma extensão única refinada pelo Trends, não duas rodadas sequenciais).
- **Trends em queda:** não estende gasto. Recomenda (via fila de decisão) **reduzir o CPA alvo em
  faixa fixa de 5% a 10%**, sem cálculo proporcional à magnitude da queda — o operador escolhe o
  valor dentro da faixa ao aplicar manualmente no Google Ads (sistema recomenda, nunca escreve).

### 5. Fôlego financeiro — teto absoluto em dólar, por cima da extensão em comissões

Vale **o menor entre** a extensão calculada em comissões (item 4) e o **teto em dólar restante** do
perfil ativo — o fôlego financeiro é um freio absoluto, não um número ilustrativo.

- **Onde mora:** `PortfolioConfig.perfilFolego` (enum novo: `INICIAL` | `CAIXA_FORMADO`) — é **estado
  do portfólio**, junto de `totalAvailableCapital` que já mora ali, não um limiar de regra. Os
  *valores* que cada perfil libera vivem em `LimiarGlobal` (padrão do ticket 07): `reteste.folego.
  inicial.tetoUsd = 200`, `reteste.folego.caixaFormado.tetoUsd = 600`.
- **Valores:** perfil `INICIAL` = **US$200** total. Perfil `CAIXA_FORMADO` = **US$600 total**
  (US$200 base + US$400 adicionais — "tolera **mais** US$400" lido como cumulativo, não substituto).
- **Promoção:** **manual e direto**, sem fila de decisão — é alteração de configuração de portfólio,
  não uma decisão sobre campanha/produto específico. Sem regra automática sobre o capital (nenhum
  limiar de "caixa formado" foi declarado, e inventar um agora seria prematuro sem dado real).
- **Acumulação:** o teto em dólar é **por Produto, acumulado entre todas as Campanhas de re-teste
  ligadas** (não reseta a cada extensão nem a cada troca de conta) — ver item 6.

### 6. "Trocar de conta" — nova Campanha, vínculo explícito, exclusivo do perfil caixa formado

Cria uma **nova `Campanha`** sob o mesmo `ProdutoAfiliado` (não um produto novo, coerente com
`CONTEXT.md` — mesmo teste, não teste novo). Precisa de **vínculo explícito**: campo novo
`Campanha.campanhaOrigemId` (auto-relação, nullable), apontando para a tentativa anterior — necessário
para que o teto de fôlego financeiro seja somado corretamente entre campanhas ligadas, em vez de
resetar a cada nova conta (o que anularia o freio do fôlego financeiro).

Essa flexibilidade **só é recomendação possível quando `perfilFolego = CAIXA_FORMADO`** — o perfil
`INICIAL` re-testa sempre na mesma `Campanha`/conta, sem opção de recriar em conta nova.

### Emenda ao ticket 05 (`SerieTermo`) — registrada aqui, não relitigada

A descoberta do item 2 acima amplia o modelo fechado no ticket 05:

- `SerieTermo.fonte` precisa aceitar fontes manuais além de `GOOGLE_KEYWORD_PLANNER`/`BING` — pelo
  menos `GLIMPSE`, `SEMRUSH`, `FLOWSPY`, e um valor genérico para entrada manual não-categorizada.
- `SerieTermo.unidade` precisa aceitar `INDICE_0_100` além de `ABSOLUTO`/`IMPRESSOES`.
- Precisa de um flag `origem` (manual vs automatizado) — mesmo padrão que `OrigemVendaAfiliado` já
  usa (`MANUAL | WEBHOOK | IMPORT`) e que `checkoutsCount` (ticket 04) usa para os três estados.
- Não é uma reabertura de decisão do ticket 05 (a forma da entidade — chave `(termoId, geo, fonte,
  data)`, três estados por ausência-de-linha + `valor` nullable — segue válida); é uma extensão do
  enum de valores aceitos. Registrado em "Not yet specified" do mapa como pendência de schema a
  aplicar junto da implementação, não como ticket novo — não há decisão em aberto, só trabalho de
  escrever a migração.

Desbloqueia parcialmente o ticket 18 (segue bloqueado pelo ticket 10, ainda aberto). Não desbloqueia o
ticket 09 (já estava desbloqueado, dependia só do 07).
