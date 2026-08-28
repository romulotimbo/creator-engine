# DataForSEO como fonte de sinal de demanda para o módulo de Afiliados

Pesquisa contra fontes primárias: `docs.dataforseo.com`, páginas oficiais de preço em `dataforseo.com/pricing/*`, e documentação oficial do Google (Google Ads Help / Google Ads API / Google Trends Help) onde necessário para comparação. Data da pesquisa: 2026-08-20.

---

## Resumo executivo — um fornecedor resolve o híbrido ou precisa de dois?

**Um fornecedor resolve — a DataForSEO entrega os dois lados do sinal híbrido, na mesma conta e na mesma carteira, mas não no mesmo endpoint.** O volume absoluto por keyword/geo vem de `keywords_data/google_ads/search_volume` (números do Keyword Planner, histórico de 4 anos) e de `dataforseo_labs/google/historical_search_volume` (histórico desde o início de 2019); o índice relativo 0–100 tipo Google Trends vem de `keywords_data/google_trends/explore`. Ambos usam a mesma credencial Basic Auth ([docs.dataforseo.com/v3/auth](https://docs.dataforseo.com/v3/auth/)) e o mesmo saldo pré-pago. O custo estimado para o uso descrito (~150 keywords, 3 geos, refresh semanal + refresh diário das campanhas vivas) fica entre **US$ 15 e US$ 72 por mês** dependendo de duas escolhas de arquitetura (batching de 5 keywords por task no Trends, e fila `standard` vs `live`) — em qualquer cenário, muito abaixo do depósito mínimo de US$ 50 ([dataforseo.com/pricing](https://dataforseo.com/pricing)).

**A ressalva que importa mais do que a contagem de fornecedores:** o lado absoluto é estruturalmente incapaz de dar *timing*. O dado do Google Ads é arredondado ("Your search volume statistics are rounded" — [support.google.com/google-ads/answer/3022575](https://support.google.com/google-ads/answer/3022575)), é uma média móvel de 12 meses, e só atualiza **uma vez por mês**, com `date_to` limitado ao mês passado ([docs Search Volume live](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)). Pedir esse endpoint diariamente devolve o mesmo número por ~30 dias. Ou seja: a decisão de "atualizar diariamente as ~10 campanhas vivas" só faz sentido aplicada ao **Google Trends**, não ao volume absoluto. O híbrido não é um luxo — é obrigatório, porque nenhum dos dois lados cobre a lacuna do outro, e isso é uma propriedade da fonte (Google), não da DataForSEO.

---

## 1. Endpoints que entregam VOLUME DE BUSCA ABSOLUTO por keyword por geo

### 1.1 `keywords_data/google_ads/search_volume` (live e task_post)

Fonte: [docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)

| Aspecto | Valor documentado |
|---|---|
| Campos retornados | `search_volume`, `monthly_searches[]` (year, month, search_volume), `competition` (HIGH/MEDIUM/LOW), `competition_index` (0–100), `cpc`, `low_top_of_page_bid`, `high_top_of_page_bid` |
| Profundidade histórica | "Historical data is available for 4 years." `date_from` tem valor mínimo de 4 anos a partir da data atual |
| Padrão sem `date_from` | Últimos 12 meses |
| Atraso de atualização | `date_to` "cannot be greater than the past month" — ou seja, **~1 mês de lag mínimo** |
| Máx. keywords por task | 1000 |
| Tasks por chamada live | "each Live API call can contain only one task" |
| Rate limit | "you can send no more than 12 requests per minute per account using Google Ads Live endpoints" |
| Geo | `location_name`, `location_code` ou `location_coordinate`; idioma via `language_name`/`language_code` |
| `search_partners` | Boolean; quando `true`, inclui "owned, operated, and syndicated networks across Google and partner sites" |

**Arredondamento — resposta direta:** o valor vem como **inteiro arredondado, não como faixa/string**. A doc da DataForSEO descreve `search_volume` como "monthly average search volume rate; represents either the (approximate) number of searches for the given keyword idea on google.com or google.com and partners" e `monthly_searches` como "represents the (approximate) number of searches on this keyword idea" ([mesma página](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)).

A origem do arredondamento é o próprio Google. O Google Ads Help afirma literalmente: **"Your search volume statistics are rounded"**, e define "Avg. monthly searches" como "The average number of times people have searched for a keyword and its close variants based on the month range as well as the location and Search Network settings you selected", com "the number of searches for the term (regardless of language) is averaged over a 12-month period" ([support.google.com/google-ads/answer/3022575](https://support.google.com/google-ads/answer/3022575)).

Duas distinções que importam para o projeto:
- **A API não devolve as faixas do tipo "1K – 10K" que a UI do Keyword Planner mostra.** A Google Ads API expõe `avg_monthly_searches` como "Approximate number of monthly searches on this query averaged for the past 12 months" e `monthly_search_volumes` como "Approximate number of searches on this query for the past twelve months" — um único número, não um intervalo ([developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics](https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics)).
- **O Google Ads Help não menciona tiers por gasto de conta.** O artigo aplica o arredondamento universalmente e não descreve acesso diferenciado por volume de investimento. Se essa distinção existe, ela não está nessa página.

**Consequência prática:** a largura do bucket não é publicada em lugar nenhum. Isso significa que uma keyword que sai de 1.300 para 1.600 pode ser ruído de arredondamento, não crescimento real. O sinal de aceleração **não deve** ser derivado de `search_volume` mês a mês.

### 1.2 `keywords_data/google_ads/status` — como saber se o mês fechou

Fonte: [docs.dataforseo.com/v3/keywords_data/google_ads/status/](https://docs.dataforseo.com/v3/keywords_data/google_ads/status/)

Retorna `actual_data` (boolean — se o Google já atualizou as métricas do mês anterior), `date_update` ("date of the latest update of Google Ads data"), `last_year_in_monthly_searches` e `last_month_in_monthly_searches`. A doc explica o ciclo: "if Google updated its data in October, you would be able to see the actual search volume ... for September. If Google didn't update its data in October, the latest information would be available for August."

Este endpoint é o gatilho correto para o job de refresh do volume absoluto: **pollar `status` barato e só chamar `search_volume` quando `actual_data` virar `true`** — em vez de agendar mensal no cego.

### 1.3 `dataforseo_labs/google/historical_search_volume` (live)

Fonte: [docs.dataforseo.com/v3/dataforseo_labs/google/historical_search_volume/live/](https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_search_volume/live/)

| Aspecto | Valor documentado |
|---|---|
| Profundidade histórica | "You can get historical search volume data since the beginning of 2019" — **maior que os 4 anos do endpoint Google Ads** |
| Datasource | "Datasource: DataForSEO Keyword Database. The data is based on Google Ads API." |
| Atualização | "We update keyword metrics once a month after the data source completes its updates." |
| Máx. keywords | 700 |
| Arredondamento | Herda o arredondamento do Google Ads (mesma origem); `search_volume` descrito como "average monthly search volume rate / represents the (approximate) number of searches" |
| Clickstream opcional | `include_clickstream_data` — "with this parameter enabled, you will be charged double the price for the request" |

Este é o endpoint certo para o **backfill histórico** ao cadastrar um produto novo (traz a série mensal inteira desde 2019 numa chamada), enquanto o `google_ads/search_volume` é melhor para o refresh incremental com bid range.

### 1.4 `dataforseo_labs/google/keyword_overview` (live)

Fonte: [docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/)

Retorna seis blocos: `keyword_info` (competition, cpc, search_volume, monthly_searches, e o objeto `search_volume_trend`), `keyword_properties` (incluindo keyword difficulty), `serp_info`, `avg_backlinks_info`, `search_intent_info`, e `clickstream_keyword_info` (opcional). Máximo de 700 keywords por chamada. Retorna `last_updated_time` por bloco, indicando quando cada métrica foi atualizada.

**O campo mais relevante para "curva ascendente":** `keyword_info.search_volume_trend`, que contém três deltas percentuais — `monthly` ("search volume change compared to the previous month"), `quarterly` ("search volume change compared to the previous quarter") e `yearly` ("search volume change compared to the previous year") ([dataforseo.com/update/search-volume-trend-in-dataforseo-labs-google-api](https://dataforseo.com/update/search-volume-trend-in-dataforseo-labs-google-api)). Exemplo publicado:

```json
"search_volume_trend": { "monthly": 49, "quarterly": 49, "yearly": -45 }
```

Isso já é uma leitura de aceleração pronta, calculada pela DataForSEO — mas sobre o dado arredondado do Google Ads, com o mesmo lag mensal. **A metodologia exata de cálculo não é publicada** (ver Lacunas).

### 1.5 `keywords_data/clickstream_data/*` — volume absoluto de origem alternativa

Fonte: [docs.dataforseo.com/v3/keywords_data/clickstream_data/overview/](https://docs.dataforseo.com/v3/keywords_data/clickstream_data/overview/)

A DataForSEO posiciona explicitamente esta família como "a reliable and innovative alternative to search volume from Google Ads", construída sobre "refined clickstream data from reliable providers" com "special multipliers derived from multiple factors". Três endpoints de volume:

- **DataForSEO Search Volume** — "search volume normalized with Bing search volume data or clickstream data for up to 1000 keywords in a single request" ([docs](https://docs.dataforseo.com/v3/keywords_data/clickstream_data/dataforseo_search_volume/live/)). Parâmetro `use_clickstream` (default `true`); quando `false`, normaliza com dados do Bing — mas "Bing search volume is available for locations provided in Bing Search Volume History Locations and Bing Ads Locations endpoints; search volume values for any other location are calculated based on clickstream data even if you set this parameter to false".
- **Global Search Volume** — "clickstream-based search volume data for up to 1000 keywords with geographical distribution across all available locations".
- **Bulk Clickstream Search Volume** — "up to 1000 keywords in a single Live request with historical monthly values for up to 12 months".

Rate limit: 2000 API calls/min. Só suporta modo Live.

**Ponto ambíguo:** a documentação **não afirma** que o volume clickstream escapa do arredondamento. Ela não descreve o formato numérico nem o erro de estimativa. É plausível que seja um inteiro não-bucketizado (por ser estimativa própria), mas isso é inferência, não fato documentado — ver Lacunas.

### 1.6 `keywords_data/google_ads/keywords_for_keywords` — expansão de termos

Fonte: [docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live/](https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live/)

Até **20 keywords semente** por requisição, devolvendo "up to 20,000 keyword suggestions with all essential keyword data" — cada sugestão com search volume, competition, competition_index, cpc, monthly_searches (12 meses) e top-of-page bids. Histórico de 4 anos. Mesmo rate limit de 12 req/min dos endpoints Google Ads live.

Relevante para o projeto porque resolve o passo anterior ao monitoramento: dado o nome do produto de afiliado, descobrir automaticamente os ~5 termos a monitorar, em vez de o operador digitá-los.

---

## 2. Endpoints que entregam SÉRIE RELATIVA tipo Google Trends (índice 0–100)

### 2.1 `keywords_data/google_trends/explore` (live e task_post)

Fontes: [live](https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/live/), [task_post](https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/task_post/), [overview](https://docs.dataforseo.com/v3/keywords_data/google_trends/overview/)

| Aspecto | Valor documentado |
|---|---|
| Escala | 0–100. "a value of 100 is the peak popularity for the term. A value of 50 means that the term is half as popular. A score of 0 means there was not enough data" |
| `item_types` | `google_trends_graph` (default), `google_trends_map`, `google_trends_topics_list`, `google_trends_queries_list` |
| Máx. keywords | 5 por task. "to obtain `google_trends_topics_list` and `google_trends_queries_list` items, specify no more than 1 keyword" |
| `time_range` (presets) | `past_hour`, `past_4_hours`, `past_day`, `past_7_days`, `past_30_days`, `past_90_days`, `past_12_months`, `past_5_years`; `2004_present` (só type `web`); `2008_present` (news/youtube/images/shopping) |
| Profundidade histórica | Web: "available from 2004-01-01". Outros types: "available from 2008-01-01" |
| `type` | `web`, `news`, `youtube`, `images`, `froogle` (default `web`) |
| Geos | **2.383 locations** (`result_count: 2383`) incluindo Country, Region, City e DMA ([locations endpoint](https://docs.dataforseo.com/v3/keywords_data/google_trends/locations/)). Cada location traz também um `geo_id` para casar com o identificador nativo do Google Trends |
| Exclusão de geos | "All locations in Russia and Belarus are no longer supported across all DataForSEO services due to the invasion of Ukraine" |
| Rate limit | "You may receive limit-related errors if over 250 Live 'Google Trends Explore' tasks are sent to our system within a minute" + "500K daily requests across all Google Trends API endpoints" |
| Rate limit geral da conta | "You can send up to 2000 API calls per minute" |

**Estrutura da série retornada** (amostra oficial da doc, request com `date_from: 2019-01-01`, `date_to: 2020-01-01`, `type: youtube`):

```json
{ "date_from": "2019-01-06", "date_to": "2019-01-12", "timestamp": 1546732800, "missing_data": false, "values": [54] },
{ "date_from": "2019-01-13", "date_to": "2019-01-19", "timestamp": 1547337600, "missing_data": false, "values": [38] }
```

Cada ponto carrega `date_from`, `date_to`, `timestamp`, `missing_data` e `values[]` (um valor por keyword da requisição).

**Resolução — este ponto é AMBÍGUO na documentação da DataForSEO.** Nem a página `live`, nem a `task_post`, nem a `overview` declaram qual é a granularidade retornada nem que ela depende do `time_range` escolhido. O que existe é evidência indireta: a amostra oficial com janela de 1 ano devolve **buckets de 7 dias**. A página `overview` diz apenas que o retorno é "keyword popularity rate over time – relative to the highest rate for the specified time period".

O Google, na sua própria documentação, confirma que a granularidade varia mas também não publica os limiares exatos: "The data shown in the graph uses Coordinated Universal Time (UTC). This applies when the data has a granularity of one day, one week, or one month" e, para janelas de 7 dias ou menos, "typically used when the data granularity is less than a day like hourly data" ([support.google.com/trends/answer/4365533](https://support.google.com/trends/answer/4365533)).

**Não escolho uma leitura aqui.** O que a documentação sustenta: existem presets de `past_30_days` e `past_90_days`, e o Google confirma que granularidade diária e horária existem — mas **nenhuma fonte primária declara o mapeamento `time_range` → granularidade**. Isso precisa ser verificado empiricamente com uma chamada real antes de dimensionar o job diário.

**Duas ressalvas de modelagem que a documentação da DataForSEO NÃO alerta:**

1. **Normalização é intra-requisição.** O Google define a escala assim: "Each data point is divided by the total searches of the geography and time range it represents to compare relative popularity" e "The resulting numbers are then scaled on a range of 0 to 100 based on a topic's proportion to all searches on all topics" ([support.google.com/trends/answer/4365533](https://support.google.com/trends/answer/4365533)). Ao enviar 5 keywords numa task, o 100 é o pico **do conjunto**, não de cada termo. Batchear 5 keywords não relacionadas para economizar custo achata as menores contra a maior. Se o batching for adotado por custo, é preciso incluir uma keyword-âncora estável em todas as tasks para poder re-escalar.
2. **A escala também é relativa à janela.** Comparar o índice de hoje com o índice de uma consulta feita mês passado, em janelas diferentes, não é válido sem re-normalização.

### 2.2 `keywords_data/dataforseo_trends/explore` (live)

Fonte: [docs.dataforseo.com/v3/keywords_data/dataforseo_trends/explore/live/](https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/explore/live/)

Índice próprio da DataForSEO, também na escala 0–100 com a mesma definição textual ("A value of 100 is the peak popularity for the term..."). Metodologia declarada: "Our algorithm provides insights into the popularity of specific keywords based on their association with relevant web pages, news articles, or shopping listings, as well as the popularity of each relevant piece of content. We also combine this information with anonymous user web behavior data from various sources."

- Mesmos presets de `time_range`; web desde 2004-01-01, demais desde 2008-01-01
- Máximo 5 keywords por requisição
- Amostra devolve agregação semanal
- **Restrição geográfica crítica:** "the minimum geographic scope supported for the DataForSEO Trends API is country level" ([locations endpoint](https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/locations/)) — sem estado/cidade/DMA, ao contrário do Google Trends
- Endpoints irmãos: `subregion_interests`, `demography`, `merged_data`
- **~9x mais barato** que o Google Trends live (ver §4)

**Não é um substituto drop-in do Google Trends.** É uma série diferente, de metodologia proprietária, sem correlação publicada com o índice do Google. Serve como camada de varredura barata sobre muitas keywords; a confirmação do sinal deve vir do Google Trends.

---

## 3. Mesma conta/credencial ou produtos separados?

**Mesma conta, mesma credencial, mesma carteira.**

A autenticação é Basic Auth com um único par login/senha para toda a plataforma: "Create a free account with DataForSEO, then go to the API Access tab in the account dashboard to find your API login and password" e "you do not have to make a separate authentication call to obtain API credentials" ([docs.dataforseo.com/v3/auth](https://docs.dataforseo.com/v3/auth/)).

O modelo comercial é pré-pago único: "pay-as-you-go pricing model" onde você "pay only for the individual services you consume", com um conjunto de "free cost management tools" para "monitor your usage and spending, control your budgets, set limits" ([dataforseo.com/pricing](https://dataforseo.com/pricing)). Não há planos, tiers de assinatura ou pacotes de créditos descritos.

Isso significa, na prática, **uma única variável de ambiente** (`DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`) cobrindo Keywords Data (Google Ads + Google Trends + DataForSEO Trends + Clickstream), DataForSEO Labs, Backlinks e Domain Analytics — todos os produtos citados neste documento.

**Ambiguidade:** a página de auth **não declara** se todas as APIs vêm habilitadas por padrão em toda conta nova, nem se há qualquer gating por produto. Ela também menciona uma seção "Sandbox" no apêndice sem detalhar o funcionamento. Ver Lacunas.

---

## 4. Modelo de cobrança, rate limits e estimativa de custo

### 4.1 Unidade de cobrança — difere por família de API

**Keywords Data API — cobra por TASK, não por keyword.** A doc é explícita: "Our system will charge your account per each request, no matter what number of keywords an array has, **the price for 1 or 1000 keywords will be the same**" ([Search Volume live](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)). Isso é a alavanca de custo mais importante do projeto: 150 keywords cabem numa única task (limite 1000).

**DataForSEO Labs API — cobra TASK + ITEM.** Preço por task mais preço por resultado retornado.

### 4.2 Tabela de preços (páginas oficiais de preço)

| Produto / endpoint | Modo | Preço | Unidade | Fonte |
|---|---|---|---|---|
| Keywords Data → Google Ads (todos os endpoints) | Standard queue | **$0.06** | por task (até 1000 kw) | [pricing/keywords-data/google-ads](https://dataforseo.com/pricing/keywords-data/google-ads) |
| Keywords Data → Google Ads | Live | **$0.09** | por task (até 1000 kw) | idem |
| Keywords Data → Google Trends | Standard queue | **$0.0027** | por task (até 5 kw) | [pricing/keywords-data/google-trends](https://dataforseo.com/pricing/keywords-data/google-trends) |
| Keywords Data → Google Trends | Live | **$0.011** | por task (até 5 kw) | idem |
| DataForSEO Trends → Explore | Live | **$0.0012** | por task (até 5 kw) | [pricing/keywords-data/dataforseo-trends-api-pricing](https://dataforseo.com/pricing/keywords-data/dataforseo-trends-api-pricing) |
| DataForSEO Trends → Subregion / Demography | Live | **$0.0024** | por task | idem |
| DataForSEO Trends → Merged Data | Live | **$0.006** | por task | idem |
| Clickstream → DataForSEO Search Volume | Live | **$0.18** | por task (até 1000 kw) | [pricing/keywords-data/clickstream-api-pricing](https://dataforseo.com/pricing/keywords-data/clickstream-api-pricing) |
| Clickstream → Global Search Volume | Live | **$0.18** | por task | idem |
| Clickstream → Bulk Search Volume | Live | **$0.012 + $0.00012** | por task + por item | idem |
| Labs Google — "all other endpoints" (inclui Keyword Overview, Historical Search Volume, Bulk Keyword Difficulty) | Live | **$0.012 + $0.00012** | por task + por item | [pricing/dataforseo-labs/dataforseo-google-api](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api) |
| Labs Google — Historical Rank | Live | **$0.12 + $0.0012** | por task + por item | idem |
| Labs Google — Historical Bulk Traffic Estimation / Domain Metrics by Categories | Live | **$0.12 + $0.0012** | por task + por domínio | idem |
| Domain Analytics → Whois Overview | Live | **$0.12 + $0.0012** | por task + por item | [pricing/domain-analytics-api/domain-analytics-whois-api](https://dataforseo.com/pricing/domain-analytics-api/domain-analytics-whois-api) |

Multiplicador de clickstream em Labs: "if you set `include_clickstream_data` to `true`, the cost of the request is multiplied by 2" ([pricing Labs](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api)).

**Custo mínimo de entrada:** "Note that the minimum payment amount is $50" ([dataforseo.com/pricing](https://dataforseo.com/pricing)). Não há mensalidade nem compromisso — é saldo pré-pago. Não foram encontradas faixas de desconto por volume publicadas; a página oferece "Request a custom pricing quote" para arranjos maiores.

> **⚠ Discrepância documentada entre docs e pricing pages.** Os valores `cost` nas respostas-exemplo da documentação estão **cerca de 20% abaixo** dos preços das páginas oficiais, de forma sistemática: Google Ads live mostra `0.075` na amostra vs `$0.09` na pricing page; Google Trends live mostra `0.009` vs `$0.011`; Labs Historical Search Volume mostra `0.0102` para 2 keywords (= $0.01 task + 2×$0.0001 item) vs `$0.012 + $0.00012`; Clickstream DataForSEO Search Volume mostra `0.15` para 3 keywords vs `$0.18`; Whois Overview mostra `0.102` para 2 resultados (= $0.10 + 2×$0.001) vs `$0.12 + $0.0012`. O padrão consistente indica que **as amostras da documentação refletem uma tabela de preços anterior**. As estimativas abaixo usam os preços das pricing pages (mais conservador). Confirmar com uma chamada real antes de fechar o orçamento.

### 4.3 Rate limits consolidados

| Escopo | Limite | Fonte |
|---|---|---|
| Conta (geral) | 2000 API calls/minuto ("Contact us if you would like to raise the limit") | [keywords_data/overview](https://docs.dataforseo.com/v3/keywords_data/overview/) |
| **Google Ads endpoints (Live)** | **12 requests/minuto por conta** | [Search Volume live](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/) |
| Google Trends Explore (Live) | 250 tasks/minuto | [Trends Explore live](https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/live/) |
| Google Trends (todos os endpoints) | 500K requests/dia | idem |
| Clickstream Data | 2000 API calls/minuto | [clickstream overview](https://docs.dataforseo.com/v3/keywords_data/clickstream_data/overview/) |
| Backlinks | 2000 calls/min, até 30 chamadas simultâneas | [backlinks/summary live](https://docs.dataforseo.com/v3/backlinks/summary/live/) |
| Domain Analytics Whois | 2000 calls/minuto | [whois overview live](https://docs.dataforseo.com/v3/domain_analytics/whois/overview/live/) |

O limite de **12 req/min nos endpoints Google Ads live** é o mais apertado e o único que pode restringir o desenho. Com 150 keywords cabendo numa task por geo, 3 geos = 3 requisições — folgado.

### 4.4 Estimativa de custo mensal — a conta

**Premissas do cenário:** 30 produtos × 5 termos = **150 keywords**; **3 geos**; refresh **semanal** de todas as 150 para aprendizado; refresh **diário** das ~10 campanhas vivas (≈ **50 keywords**). Mês = 4,33 semanas / 30 dias.

#### Camada A — volume absoluto (Google Ads Search Volume, live)

150 keywords cabem em 1 task (limite 1000). Uma task por geo.

| Cadência | Cálculo | Tasks/mês | Custo/mês |
|---|---|---|---|
| Semanal (150 kw × 3 geos) | 3 tasks × 4,33 semanas | 13 | 13 × $0.09 = **$1,17** |
| Diário (50 kw × 3 geos) | 3 tasks × 30 dias | 90 | 90 × $0.09 = **$8,10** |
| **Subtotal A (como pedido)** | | 103 | **$9,27** |

**Mas essa camada diária é desperdício.** O dado só muda uma vez por mês. A versão racional:

| Cadência racional | Cálculo | Tasks/mês | Custo/mês |
|---|---|---|---|
| Mensal, disparado por `status.actual_data` | 3 tasks × 1 | 3 | 3 × $0.09 = **$0,27** |

#### Camada B — série relativa (Google Trends Explore, live)

Máximo 5 keywords por task, 1 geo por task. Duas arquiteturas:

**B1 — batching de 5 kw/task (barato, mas normalização compartilhada):**

| Cadência | Cálculo | Tasks/mês | Custo/mês |
|---|---|---|---|
| Semanal (150 kw ÷ 5 = 30 tasks × 3 geos = 90) | 90 × 4,33 | 390 | 390 × $0.011 = **$4,29** |
| Diário (50 kw ÷ 5 = 10 tasks × 3 geos = 30) | 30 × 30 | 900 | 900 × $0.011 = **$9,90** |
| **Subtotal B1** | | 1.290 | **$14,19** |

**B2 — 1 kw/task (série independente e limpa por termo):**

| Cadência | Cálculo | Tasks/mês | Custo/mês |
|---|---|---|---|
| Semanal (150 kw × 3 geos = 450) | 450 × 4,33 | 1.949 | 1.949 × $0.011 = **$21,44** |
| Diário (50 kw × 3 geos = 150) | 150 × 30 | 4.500 | 4.500 × $0.011 = **$49,50** |
| **Subtotal B2** | | 6.449 | **$70,94** |

*Checagem de rate limit para B2:* 150 tasks/dia contra 250 tasks/minuto — cabe em menos de 1 minuto de janela. Sem problema.

**B2 na fila Standard ($0.0027/task, turnaround até 45 min):** 6.449 × $0.0027 = **$17,41/mês** — 75% mais barato que live, com latência irrelevante para um job noturno.

#### Camada C — enriquecimento Labs (Keyword Overview semanal: CPC, difficulty, intent, `search_volume_trend`)

150 kw ÷ 700 por task = 1 task por geo. 3 tasks × 4,33 = 13 tasks/mês; itens = 150 × 3 × 4,33 = 1.949.

- Tasks: 13 × $0.012 = $0,156
- Itens: 1.949 × $0.00012 = $0,234
- **Subtotal C = $0,39/mês**

#### Camada D — backfill histórico (Labs Historical Search Volume, one-shot por produto novo)

3 tasks (1 por geo) + 450 itens = 3 × $0.012 + 450 × $0.00012 = $0,036 + $0,054 = **$0,09** por backfill completo do catálogo.

#### Totais

| Cenário | Composição | **Total/mês** |
|---|---|---|
| **Mínimo viável** (Trends batched live + Ads mensal + Labs) | $14,19 + $0,27 + $0,39 | **≈ $14,85** |
| **Como pedido literalmente** (Trends batched + Ads diário) | $14,19 + $9,27 + $0,39 | **≈ $23,85** |
| **Séries limpas, fila standard** (B2 standard + Ads mensal + Labs) | $17,41 + $0,27 + $0,39 | **≈ $18,07** |
| **Séries limpas, tudo live** (B2 live + Ads diário + Labs) | $70,94 + $9,27 + $0,39 | **≈ $80,60** |

**Leitura:** o custo é dominado pela camada Trends, e dentro dela pela decisão de batching. A recomendação de melhor custo-benefício é **B2 na fila standard** — séries independentes e limpas por keyword, sem o problema de normalização compartilhada, por $18/mês. O volume absoluto é praticamente gratuito porque cabe em uma task por geo.

Se DataForSEO Trends ($0.0012/task, country-level) substituísse o Google Trends na varredura semanal: 1.949 tasks × $0.0012 = **$2,34/mês** — reservando o Google Trends só para os termos que passaram do filtro.

**Runway do depósito mínimo:** os $50 mínimos cobrem **~3 meses** no cenário mínimo viável e **~2,8 meses** no cenário de séries limpas standard.

---

## 5. CPC / competição / bid range por keyword — substitui o preenchimento manual?

**Sim, e por dois caminhos complementares.**

### 5.1 Métricas históricas de leilão — `keywords_data/google_ads/search_volume`

Já retorna, na mesma resposta do volume, sem custo adicional ([docs](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)):

| Campo | Descrição | Mapeamento no projeto |
|---|---|---|
| `low_top_of_page_bid` | lance mínimo para exibição no topo da página | → `cpcMinimo` |
| `high_top_of_page_bid` | lance máximo para exibição no topo da página | → `cpcMaximo` |
| `cpc` | custo por clique em USD | → `cpcMedioEsperado` |
| `competition` | HIGH / MEDIUM / LOW | → nível de competição |
| `competition_index` | inteiro 0–100 | → competição granular |

Ou seja, o par `low_top_of_page_bid` / `high_top_of_page_bid` **é literalmente o bid range** que o operador preenche à mão hoje. Como o preço é por task (não por keyword), preencher os 3 campos para todas as 150 keywords em 3 geos custa **$0,27/mês** na cadência mensal correta.

Os mesmos campos aparecem em `keywords_for_keywords` ([docs](https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live/)) e as métricas `cpc` + `competition` também em `dataforseo_labs/google/keyword_overview` e `historical_search_volume`.

### 5.2 Previsão prospectiva de leilão — `keywords_data/google_ads/ad_traffic_by_keywords`

Fonte: [docs.dataforseo.com/v3/keywords_data/google_ads/ad_traffic_by_keywords/live/](https://docs.dataforseo.com/v3/keywords_data/google_ads/ad_traffic_by_keywords/live/)

Este é o endpoint que o preenchimento manual **não** consegue replicar: dado um lance e um tipo de correspondência, projeta o desempenho futuro.

- **Entradas obrigatórias:** `bid` (inteiro — "the higher value you specify here, the higher values you will get in the returned metrics") e `match` (`exact`, `broad` ou `phrase`)
- **Saídas:** `impressions` ("projected number of ad impressions"), `ctr` ("projected click through rate (CTR) of the advertisement"), `average_cpc` ("cost-per-click (USD) estimated for a keyword"), `cost` ("charge for an ad" no período), `clicks` ("number of clicks an ad is projected to get within the specified time period")
- **Janela de previsão:** `date_from`/`date_to` (mínimo: amanhã; máximo: mesmo dia/mês do ano seguinte) ou `date_interval` (`next_week`, `next_month`, `next_quarter`; default `next_month`)
- **Limites:** até 1000 keywords por requisição; 80 caracteres por keyword; máximo de 10 palavras por frase
- **Preço:** mesma tabela Google Ads ($0.06 standard / $0.09 live por task, independente do número de keywords)

**Uso prático:** varrer 3–5 valores de `bid` por keyword para reconstruir a curva lance→volume de clique antes de subir a campanha — algo que hoje só se descobre queimando budget.

---

## 6. "Idade da oferta" / data de primeira aparição de domínio ou termo

**Não existe endpoint chamado "idade da oferta" nem "first seen" para keyword.** Existem cinco sinais parciais que, combinados, distinguem produto novo de produto em recuperação. Ordenados por utilidade:

### 6.1 `domain_analytics/whois/overview` — data de registro do domínio

Fonte: [docs.dataforseo.com/v3/domain_analytics/whois/overview/live/](https://docs.dataforseo.com/v3/domain_analytics/whois/overview/live/)

Retorna `created_datetime` = **"date and time (in the ISO 8601 format) when the domain was first registered"**, além de `changed_datetime`, `expiration_datetime` e `registrar`. Exemplo na doc: `"2005-02-15 03:13:12 +00:00"`.

**Ressalva estrutural importante:** este endpoint **não é um lookup WHOIS ao vivo por domínio**. É uma **busca filtrada sobre a base própria da DataForSEO**. Você monta `filters` (até 8, com operadores `regex`, `<`, `<=`, `>`, `>=`, `=`, `<>`, `in`, `not_in`, `like`, `not_like`) — o exemplo oficial é `["domain", "like", "%seo%"]`. Limite de 1000 domínios por resposta (default 100).

Consequência: **se o domínio da oferta não estiver na base, não há resposta.** A base declarada tem **286.737.287 domínios**, com 23.277.937 atualizados nos últimos 30 dias ([dataforseo.com/apis/domain-analytics-api](https://dataforseo.com/apis/domain-analytics-api)). É grande, mas cobertura por TLD não é publicada — e domínios de VSL de nutra frequentemente usam TLDs incomuns e são recém-registrados. Ver Lacunas.

Custo: $0.12 por task + $0.0012 por item. Consultando os 30 domínios do catálogo num filtro `in` numa única task: $0.12 + 30 × $0.0012 = **$0,156**.

### 6.2 `backlinks/summary` — primeira vez que o crawler viu um backlink para o alvo

Fonte: [docs.dataforseo.com/v3/backlinks/summary/live/](https://docs.dataforseo.com/v3/backlinks/summary/live/)

Retorna `first_seen` = **"date and time when our crawler found the backlink for the `target` for the first time"** (UTC, `yyyy-mm-dd hh-mm-ss +00:00`) e `lost_date` = "date and time when the backlink was lost" (quando o crawler recebeu 4xx/5xx ou o último backlink foi removido). Também `referring_domains` e `referring_main_domains`.

**É um proxy, não a idade da oferta.** Mede quando a DataForSEO **descobriu** o primeiro link, não quando o domínio nasceu nem quando a oferta foi ao ar. Domínio registrado e sem tráfego de afiliado por 6 meses não aparece aqui.

### 6.3 `backlinks/timeseries_summary` — o melhor sinal para "novo vs. recuperação"

Fonte: [docs.dataforseo.com/v3/backlinks/timeseries_summary/live/](https://docs.dataforseo.com/v3/backlinks/timeseries_summary/live/)

Série temporal do perfil de backlinks, com `group_range` em **day, week, month ou year**, retornando por período `rank`, `backlinks`, `backlinks_nofollow`, `referring_pages`, `referring_domains`, `referring_pages_nofollow`. **"Historical data is available from `2019-01-30`."**

Este é o endpoint que responde melhor à pergunta do projeto: um domínio cujo `referring_domains` sobe do zero é **produto novo**; um domínio com um platô antigo, uma queda, e agora uma nova subida é **recuperação**. A forma da curva de aquisição de links distingue os dois casos — algo que `created_datetime` sozinho não faz (um domínio de 2019 relançado hoje tem `created_datetime` antigo e comportamento de produto novo).

### 6.4 `dataforseo_labs/google/historical_rank_overview` — histórico de ranqueamento

Fonte: [docs.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live/](https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live/)

Distribuição histórica de posições orgânicas/pagas, ETV, traffic cost e métricas de mudança (`is_new`, rank up/down/lost), com granularidade **mensal**. "Historical data is available from `2020-10-01`" e "data is updated weekly, the latest update time is available in the Status endpoint".

**Limitação para este uso:** o piso de 2020-10-01 significa que um domínio anterior a essa data aparece com dados desde outubro de 2020 sem qualquer indicação de atividade prévia — o endpoint não revela primeira aparição real. Preço: $0.12/task + $0.0012/item (tier "Historical Rank").

### 6.5 Sinais no nível do TERMO (não do domínio)

- **`dataforseo_labs/google/historical_search_volume`** — série mensal desde o início de 2019. O mês em que um termo de marca sai do zero é a melhor aproximação de "quando o produto entrou no mercado".
- **`keywords_data/google_trends/explore` com `time_range: 2004_present`** — a janela mais longa disponível em toda a plataforma para um termo. Um termo de marca com pico em 2021, vale, e nova subida agora é **recuperação** — leitura que nenhum endpoint de domínio entrega.

**Recomendação de composição:** `created_datetime` (idade do domínio) + `backlinks/timeseries_summary` (forma da curva de links) + `historical_search_volume` do termo de marca (forma da curva de demanda). Os três juntos separam "produto novo" de "produto em recuperação"; nenhum sozinho separa.

---

## Lacunas — o que a documentação NÃO responde

1. **Mapeamento `time_range` → granularidade no Google Trends.** Nenhuma das três páginas relevantes ([live](https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/live/), [task_post](https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/task_post/), [overview](https://docs.dataforseo.com/v3/keywords_data/google_trends/overview/)) declara se a série volta horária, diária, semanal ou mensal, nem que isso depende da janela. A única evidência é a amostra oficial (janela de 1 ano → buckets de 7 dias). O Google confirma que a granularidade varia mas também não publica os limiares ([support.google.com/trends/answer/4365533](https://support.google.com/trends/answer/4365533)). **Isto precisa ser verificado empiricamente antes de dimensionar o job diário** — se `past_30_days` não devolver granularidade diária, o requisito de "atualização diária" perde a base.

2. **Preços das amostras da documentação contradizem as pricing pages** de forma sistemática (~20% abaixo), em cinco APIs diferentes. Não há nota de versionamento explicando qual é a tabela vigente. As estimativas deste documento usam as pricing pages por serem mais conservadoras, mas a discrepância não está resolvida.

3. **Largura dos buckets de arredondamento do Google Ads não é publicada** — nem pela DataForSEO nem pelo Google. Sem isso, é impossível calcular o limiar mínimo de variação que constitui sinal em vez de ruído de arredondamento.

4. **A DataForSEO não alerta sobre a normalização intra-requisição do Google Trends.** Nenhuma página lida menciona que enviar 5 keywords numa task faz o 100 ser o pico do conjunto. É comportamento conhecido do Google Trends, mas quem lê apenas a doc da DataForSEO vai batchear por economia e obter séries silenciosamente distorcidas.

5. **Formato numérico do volume clickstream.** A [doc do DataForSEO Search Volume](https://docs.dataforseo.com/v3/keywords_data/clickstream_data/dataforseo_search_volume/live/) não declara se o valor é arredondado, bucketizado, ou um inteiro de estimativa livre — nem publica margem de erro. Como o pitch da família é ser "a reliable and innovative alternative to search volume from Google Ads", essa é justamente a informação que faltava.

6. **Cadência de atualização das bases do Labs não é numérica.** O [endpoint status](https://docs.dataforseo.com/v3/dataforseo_labs/status/) devolve `date_update` por fonte (google/bing/amazon), mas a doc não declara a frequência esperada. Só `historical_search_volume` diz explicitamente "once a month"; para os demais é preciso pollar `status`.

7. **Cálculo do `search_volume_trend` não é publicado.** A [página de anúncio](https://dataforseo.com/update/search-volume-trend-in-dataforseo-labs-google-api) define os três campos como variação percentual mensal/trimestral/anual, mas não diz sobre qual base, se há suavização, nem como o arredondamento do Google Ads propaga para o percentual. Um delta de +49% sobre valores bucketizados pode ser um único salto de bucket.

8. **Cobertura por TLD da base WHOIS não é publicada.** São 286M domínios ([dataforseo.com/apis/domain-analytics-api](https://dataforseo.com/apis/domain-analytics-api)), mas não há garantia de que domínios recém-registrados de VSL de nutra estejam presentes — que é exatamente o caso de uso. Não há também declaração de latência entre registro e aparição na base.

9. **Não há endpoint de "primeira aparição" de keyword.** O piso de cada fonte é fixo e artificial: Labs Historical Search Volume começa em 2019, Backlinks Timeseries em 2019-01-30, Labs Historical Rank em 2020-10-01. Um produto anterior a esses pisos é indistinguível de um produto que existe desde o piso.

10. **Habilitação de produtos por conta não é documentada.** A [página de auth](https://docs.dataforseo.com/v3/auth/) não declara se todas as APIs vêm ativas por padrão, se há gating, nem detalha o Sandbox mencionado no apêndice.

11. **Correlação entre DataForSEO Trends e Google Trends não é publicada.** A [doc do DataForSEO Trends](https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/explore/live/) descreve a metodologia em termos gerais ("anonymous user web behavior data from various sources") mas não apresenta nenhuma validação contra o índice do Google. Sem isso, não é possível saber se serve como pré-filtro barato ou se é uma série descorrelacionada.

12. **Quais tipos de location funcionam com `explore`.** O [endpoint de locations](https://docs.dataforseo.com/v3/keywords_data/google_trends/locations/) lista 2.383 locations incluindo Region, City e DMA, mas a doc do `explore` não confirma que todos os tipos são aceitos no parâmetro `location_code` — só mostra exemplo de país (`2840`). Para o Brasil especificamente, a granularidade sub-nacional utilizável não está confirmada.

13. **Sem SLA/uptime publicado** em nenhuma das páginas de documentação ou de preço consultadas.

---

## Anexo — mapa rápido endpoint → necessidade do projeto

| Necessidade | Endpoint | Cadência certa | Custo |
|---|---|---|---|
| Volume absoluto + bid range + competição | `keywords_data/google_ads/search_volume` (live) | Mensal, disparado por `google_ads/status.actual_data` | $0.09/task, 3 tasks/mês |
| Backfill histórico ao cadastrar produto | `dataforseo_labs/google/historical_search_volume` | One-shot | $0.012 + $0.00012/kw |
| Delta de aceleração pronto | `dataforseo_labs/google/keyword_overview` → `search_volume_trend` | Semanal | $0.012 + $0.00012/kw |
| Timing / índice relativo 0–100 | `keywords_data/google_trends/explore` | Semanal (todos) + diário (campanhas vivas) | $0.011 live / $0.0027 standard por task de 5 kw |
| Pré-filtro barato sobre muitas keywords | `keywords_data/dataforseo_trends/explore` (só country-level) | Semanal | $0.0012/task |
| Descobrir os 5 termos de um produto novo | `keywords_data/google_ads/keywords_for_keywords` | On-demand | $0.09/task (até 20 sementes → 20k sugestões) |
| Curva lance→clique antes de subir campanha | `keywords_data/google_ads/ad_traffic_by_keywords` | On-demand | $0.09/task |
| Idade do domínio da oferta | `domain_analytics/whois/overview` → `created_datetime` | One-shot por produto | $0.12 + $0.0012/item |
| Novo vs. recuperação (forma da curva) | `backlinks/timeseries_summary` (desde 2019-01-30) | Mensal | por request |
