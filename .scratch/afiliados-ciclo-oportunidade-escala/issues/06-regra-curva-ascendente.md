# 06 — Regra de oportunidade: o que é uma "curva ascendente"

Type: grilling
Status: closed
Blocked by: —

## Question

O sinal de oportunidade é "curva ascendente de produto novo" ou "curva ascendente de recuperação de
produto antigo". Transformar isso em regra executável que enche a fila de decisão.

Decidir:

- **Janela e magnitude**: sobre quantos períodos se lê a curva, e qual variação percentual conta
  como ascensão. O CSV do Radar já traz `trafficGrowth30/60/90` da rede — a regra nova substitui,
  complementa ou ignora esses campos?
- **Novo vs recuperação**: o que distingue os dois casos operacionalmente. "Novo" se apoia em idade
  da oferta (`data_criacao_oferta` no doc de mapeamento, hoje não modelada) ou em ausência de
  histórico de série? "Recuperação" exige queda anterior — de que profundidade?
- **Sazonalidade**: produtos de emagrecimento sobem em jan–mar todo ano. A regra distingue subida
  sazonal de subida estrutural, ou aceita o falso positivo?
- **Qual série decide** — a absoluta (volume) ou a relativa (índice)? A recomendação do charting é
  que o índice dá timing e o volume dá escala; a regra de oportunidade precisa das duas ou de uma?
- **Volume mínimo**: um termo que vai de 20 para 60 buscas/mês subiu 200% e não significa nada.
  Qual o piso absoluto para o sinal valer?
- Como o item entra na fila: por termo, por oferta, ou por produto?

## Achados de dado REAL (export do Keyword Planner, 23/08/2026)

Fixture: `.scratch/fixtures/keyword-stats-2026-08-23.tsv` — 4 termos, geo US, janela ago/2025–jul/2026.

### 1. O piso de detecção é ~20%, e isso define o limiar mínimo da regra

Os valores **não são faixas**, mas são **quantizados numa escada**. Degraus consecutivos observados:
1,215 · 1,218 · 1,222 · 1,227 · 1,229 — e saltos de 1,49 ≈ 1,22² (dois degraus). O ajuste é apertado
demais para ser coincidência.

**Consequência dura: variação abaixo de ~20% é indistinguível de ruído de arredondamento.** Qualquer
limiar de "curva ascendente" menor que isso está medindo a escada, não a demanda. Evidência direta na
fixture: `weight loss` repete exatamente `110000` em quatro meses distintos (out/25, jan, fev, mar/26)
— variação real achatada num degrau só.

Ressalva: a escada não é perfeitamente uniforme (880 → 1000 dá 1,136, fora do padrão). O piso de 20%
é a leitura defensável; a forma exata da escada não está publicada e não foi resolvida.

### 2. Dois casos-limite que quebram regra percentual

- **`lipobliss`: YoY = `∞`.** Literalmente infinito no export, porque a série vai de **0 → 90**
  (sete meses zerados, depois 10, 90, 70, 70, 90). Este é exatamente o caso "produto novo em curva
  ascendente" que a regra existe para pegar — e é o caso em que variação percentual não é calculável.
  A regra precisa de tratamento próprio para saída-do-zero, não de um limiar percentual.
- **`nerve pain supplement`: retorno vazio.** Sem volume, sem competição, sem bid — nem zero, **nada**.
  "Sem dado" e "demanda zero" são estados diferentes e o modelo precisa distingui-los. Um termo sem
  série não pode ser lido como termo sem demanda.

### 3. O sinal da rede e o sinal de busca se contradizem — e isso é o achado central

Comparando a fixture com `docs/afiliados/produtos.csv` (`trafficGrowth30` da rede):

| Termo | Rede (`trafficGrowth30`) | Google (busca) |
|---|---|---|
| `nerve fresh` | **+85,6%** | **−45% em 3m, −52% YoY** (1300 → 480) |
| `lipobliss` | **−62,3%** | **+29% em 3m**, série 0 → 90 |

**Os dois sinais apontam em direções opostas, nos dois produtos.** Não é ruído: eles medem coisas
diferentes. `trafficGrowth30` é tráfego à página da oferta — movido pela mídia **de outros afiliados**.
Volume de busca é demanda **do usuário final**.

Isso obriga a regra a escolher, e a escolha muda o significado de "oportunidade":

- Tráfego da rede subindo = outros afiliados estão escalando. Prova que converte, **mas é saturação**
  chegando: mais concorrência no leilão.
- Busca subindo = demanda final crescendo, **headroom** — e possivelmente ninguém disputando ainda.

O Radar hoje pontua sobre `trafficGrowth30` (via `scoreBreakdown`). O pedido original do operador
fala em "indicadores de busca dos termos". **São critérios diferentes e o mapa nunca tinha notado
que divergem.** Decidir: a regra usa busca, usa rede, ou usa a **divergência entre as duas** como
sinal próprio (busca subindo + rede caindo = janela antes da concorrência chegar).

### 4. Dados que chegam de graça no mesmo export

`Three month change`, `YoY change`, `Competition` (Alto/Médio/Baixo) + índice 0–100, e
`Top of page bid (low/high range)`. Mapeiam direto em `cpcMinimo`/`cpcMaximo` e aposentam o
preenchimento manual no Radar. Observado: `nerve fresh` tem competição **99/100 com busca caindo**
— combinação que a regra provavelmente deveria penalizar explicitamente.

## Notas herdadas dos tickets 01 e 21

- **A série de um termo no Trends não é comparável com a de outro termo** — em qualquer caminho
  praticável hoje. O índice 0–100 é normalizado pelo pico da própria série (e, se batcheado, pelo
  pico do conjunto). A regra só pode falar de um termo **contra o passado dele mesmo**; ranking
  "termo A está mais quente que termo B" via índice é inválido. *Ressalva do ticket 21:* na **API
  oficial** de Trends a escala é consistente entre requisições e permitiria comparação — mas essa API
  está inacessível (alpha por aplicação, docs em 404), então a restrição acima é a que vale.
- **As duas séries têm relógios diferentes por natureza da fonte**, não por escolha: volume absoluto
  atualiza uma vez por mês, índice relativo é diário/semanal. Uma regra que exija as duas alinhadas
  no mesmo instante não é implementável.
- **Talvez não exista índice relativo nenhum.** O ticket 21 fechou sem caminho gratuito oficial para
  essa metade. A compensação é que `monthly_search_volumes[]` traz **4 anos de série mensal**, ou
  seja, a curva existe no lado absoluto — só que em resolução mensal e sobre dado arredondado. Se o
  ticket 22 decidir abrir mão do índice, esta regra opera **só sobre volume mensal**, e a distinção
  "está subindo agora" vs "subiu no mês passado" deixa de ser observável.
- **Candidato para distinguir "novo" de "recuperação"**: `backlinks/timeseries_summary` (histórico
  desde 2019-01-30) — a forma da curva de aquisição de backlinks do domínio da oferta separa os dois
  casos melhor que data de registro WHOIS, que é lookup sobre base própria e falha justamente em
  domínios de VSL recém-registrados. Custa chamadas extras: avaliar se vale, ou se "ausência de
  histórico de série" já basta como definição de "novo".

## Decision (24/08/2026)

Fechado por interview (`/grilling`). Forma final da regra:

1. **Busca é o portão, rede é o modificador de prioridade.** A regra exige busca ascendente — sem
   isso, nada entra na fila, sem exceção (nenhum bucket separado de "alerta" para busca caindo, mesmo
   com `trafficGrowth30` subindo: isso é escopo novo, não parte desta regra). Dentro de busca ↑,
   `trafficGrowth30` da rede modula prioridade: **Busca↑ + Rede↓** = prioridade máxima (janela antes
   da concorrência chegar); **Busca↑ + Rede↑** = prioridade média (mercado provado, mas concorrência
   já entrando).
2. **Duas janelas prontas do export do Keyword Planner** — `Three month change` (timing/curto prazo)
   e `YoY change` (estrutural/12 meses) — nenhuma janela customizada é calculada.
3. **Piso de magnitude: ≥40%** (2 degraus da escada de quantização, um degrau isolado é ruído) em
   pelo menos uma das duas janelas. **Exceção — saída-do-zero**: histórico com meses zerados/nulos
   virando volume positivo (`YoY = ∞`, caso `lipobliss`) conta como ascensão sempre, sujeita só ao
   piso de volume (item 6).
4. **Novo vs recuperação**, resolvido de graça pela mecânica acima: "novo" = ausência de histórico de
   série (inclui saída-do-zero); "recuperação" = tinha volume, caiu, subiu ≥40% de novo a partir de
   histórico não-zero.
5. **Sazonalidade não é filtrada.** Aceita o falso positivo — coerente com a decisão de fora-de-escopo
   de inferência estatística/ML no mapa. A fila registra **qual janela disparou** (3-month isolado,
   YoY isolado, ou ambos) para o operador julgar visualmente. Detecção multi-ano (via
   `monthly_search_volumes[]`, achado do ticket 21) fica em "Not yet specified" — não é regra agora.
6. **Piso de volume: 300 buscas/mês** no geo alvo, como default global com override por produto —
   segue o padrão já fixado no mapa para limiares da fila de decisão codificada.
7. **Granularidade da fila: um item por `OfertaDecisao`**, não por termo isolado (a ação de "testar" é
   no nível da oferta). O(s) termo(s) que dispararam entram num breakdown por item, no mesmo padrão do
   `scoreBreakdown` já usado no Radar. Mecânica de reabrir o item se outro termo da mesma oferta subir
   depois é escopo do ticket 18 (modelo da fila), não deste ticket.
8. **Enriquecimento sem gate**: Competition (Alto/Médio/Baixo + índice 0–100) e Top of page bid
   (low/high) do mesmo export entram como contexto visível no item da fila — não como critério de
   corte. Aposentam o preenchimento manual de `cpcMinimo`/`cpcMaximo` no Radar.

**Desbloqueia parcialmente o ticket 18** (modelo da fila de decisão) — 18 segue bloqueado até 07, 08
e 10 também fecharem, mas já tem a forma do item de oportunidade (breakdown por termo, prioridade em
3 níveis) para desenhar em cima.
