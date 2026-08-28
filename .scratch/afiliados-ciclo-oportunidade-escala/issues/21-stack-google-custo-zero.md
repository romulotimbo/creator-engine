# 21 — Stack Google de custo zero: as três incógnitas

Type: research
Status: resolved
Blocked by: —

## Question

A DataForSEO foi descartada: a verificação da conta exige depósito de US$50, tornando o crédito de
trial de US$1 inutilizável. Sem free tier real, o fornecedor sai.

A alternativa é o **stack Google puro**, custo zero, sem fornecedor novo — o operador já tem conta
Google Ads ativa com gasto. Três incógnitas travam a decisão:

1. **Explorer Access cobre Keyword Planner em produção?**
2. **Google Ads Scripts alcança dados de Keyword Planner?**
3. **Qual o estado da API oficial de Google Trends?**

Saída esperada: **go/no-go no stack de custo zero**.

## Asset

Achados da pesquisa: `../research/21-stack-google-custo-zero.md`

## Answer

**GO parcial, e o corte cai exatamente no meio do híbrido.** O lado do **volume absoluto** é
alcançável de graça, mas atrás de duas aprovações humanas na Google. O lado do **índice relativo** —
o que dava *timing* — **não tem caminho gratuito oficial hoje**.

### 1. Explorer Access bloqueia Keyword Planner — por nome

A página de access levels lista `KeywordPlanIdeaService` (e todos os `KeywordPlan*Service`) na tabela
**"Restricted Services and Methods"** sob Explorer. Confirmado independentemente pelo blog oficial de
2025-10-28: *"restrictions on functionality, such as creating new advertiser accounts and keyword
planning"*. **A restrição é do token, não da conta** — ter gasto real não ajuda em nada.

**Segundo portão, que não estava no radar:** mesmo com Basic Access, o token precisa da *permissible
use* **"Researching keywords and recommendations"** para tocar o `KeywordPlanIdeaService`. Se a
aplicação for aprovada como "Reporting", continua fechado. São **dois julgamentos humanos**, ambos
gratuitos, ambos fora do controle do operador — e é aí que mora todo o risco de cronograma.

### 2. Scripts → Keyword Planner está morto, e pelo motivo errado

Não é cota: é **ausência de superfície**. Zero ocorrências de keyword planning na referência completa
do `AdsApp`. E o ponto decisivo: os 5 recursos GAQL `keyword_plan*` existem e são queryable, mas
contêm **só configuração** (`text`, `cpc_bid_micros`, `match_type`, `negative`) — todos da categoria
`ATTRIBUTE`, **nenhuma métrica**. **Volume de busca não é campo GAQL em lugar nenhum da API.**

Duas correções a premissas que este mapa carregava:

- `AdsApp.mutate()` **aceita sim** as 5 operações de keyword plan — dá para criar um plano. É beco
  sem saída: gerar métricas é um RPC não invocável pelo Scripts.
- **Criar plano não é mais necessário** — `GenerateKeywordHistoricalMetrics` recebe as keywords
  direto no request.

`UrlFetchApp` também não salva: não há credencial ambiente no Scripts, e a chamada exigiria o mesmo
developer token travado.

**Nota favorável, e importante:** Scripts **não usa developer token** e roda em regime de cota por
tempo (30 min). A ingestão de performance/search terms/geo/device já decidida no ticket 02
**continua intacta** — nada do que foi travado ali depende deste resultado.

### 3. A API oficial de Trends existe e está inacessível

Alpha por aplicação desde 2025-07-24. Segue alpha hoje: **zero posts de follow-up** em 28 publicações
do Search Central Blog no intervalo, e 4 caminhos de documentação retornam **404** — a própria Google
publica página de troubleshooting confirmando que 404 é o esperado para quem não foi aceito.
Gratuidade e quotas: indetermináveis publicamente. `pytrends` foi **arquivado pelo dono em
2025-04-17**, read-only.

**Achado que corrige uma premissa deste mapa:** na API oficial a normalização **não é
intra-requisição**. Verbatim: *"Since API data is not scaled from 0 to 100"* e *"scaling which is
consistent across requests, and lets you join, compare, and merge data from multiple requests"*.
Isso é **melhor** do que se supunha — permitiria append incremental sem re-escalar histórico. Mas:
(a) a doc **não diz qual é a escala real**, e (b) isso vale para a API inacessível, **não** para o
Trends web nem para wrappers, onde a normalização intra-requisição do 0–100 continua valendo. Ou
seja: para qualquer caminho praticável hoje, a ressalva original do ticket 01 **segue de pé**.

### Bônus — Bing Webmaster Tools vale mais que o esperado

`GetKeywordStats(q, country, language)` devolve `Query` / `Date` / `Impressions` /
`BroadImpressions`. Os parâmetros são **arbitrários — não há `siteUrl`**, então não está restrito às
queries do site do operador. É **série temporal de volume absoluto por geo, gratuita, sem fila de
aprovação**. Motor errado (Bing, não Google) e exige um site verificado para gerar a chave — o
operador tem `romulohub.cloud` e `zernio.com`, então isso é factível. **É o único caminho que produz
dado útil imediatamente.**

### Compensação que o mapa não estava contando

`GenerateKeywordHistoricalMetrics` já devolve **`monthly_search_volumes[]` com 4 anos de série
mensal na mesma chamada**. Isso sozinho dá forma de curva — não é só um ponto de volume. Reduz
bastante a dependência do índice relativo para detectar "curva ascendente", ao custo de resolução
mensal e do ruído de arredondamento.

Escala: até 10k keywords/request, **1 request por geo** (a resposta não tem dimensão de geo), ~24
requisições/semana contra teto de 15.000/dia — folga de três ordens de grandeza. **O gargalo é 100%
aprovação, zero técnico.**

### Duas armadilhas operacionais

- **`include_adult_keywords` tem default `false`** — vai comer termos de nutra silenciosamente.
  Precisa ser explicitamente `true` no contrato de ingestão.
- **Contradição na própria doc da Google sobre profundidade**: `HistoricalMetricsOptions` diz 4 anos,
  a descrição do campo diz 12 meses. Marcado como ambíguo, não resolvido.

### A incerteza residual que só o operador resolve

A regra "conta com pouco gasto vê faixas em vez de números" ficou **NÃO CONFIRMADA** — existe só em
threads de comunidade, e nenhuma fonte primária da Google diz se vale para a API. Se valer, muda
tudo: faixas do tipo "1K–10K" inviabilizam qualquer regra de curva. **Resolve-se comparando UI e API
nas mesmas keywords**, o que exige a conta logada e o acesso já aprovado.
