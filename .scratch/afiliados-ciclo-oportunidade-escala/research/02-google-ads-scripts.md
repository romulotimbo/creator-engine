# Google Ads Scripts como camada de ingestão — viabilidade dos três grãos

> Pesquisa contra fontes primárias: `developers.google.com/google-ads/scripts`, `developers.google.com/google-ads/api` e `developers.google.com/apps-script` (a doc de Scripts delega explicitamente parte dos limites para a doc do Apps Script). Onde a fonte primária for a Central de Ajuda do Google Ads (`support.google.com`), isso está sinalizado.
>
> Versão da Google Ads API referenciada nos exemplos da doc de Scripts no momento da pesquisa: **v25**.

---

## Resumo executivo

**Sim — os três grãos cabem inteiramente em Google Ads Scripts, sem necessidade da API oficial.** O motor de relatórios do Ads Scripts *é* a Google Ads API: a doc afirma que "the reporting infrastructure is backed by the Google Ads API and uses GAQL", e `AdsApp.report()` / `AdsApp.search()` aceitam GAQL arbitrário contra o catálogo completo de recursos e campos da API ([reports](https://developers.google.com/google-ads/scripts/docs/concepts/reports), [AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)). Isso significa que (a) performance de campanha por dia sai de `FROM campaign` com `segments.date`; (b) termos de pesquisa saem de `FROM search_term_view` — que é literalmente o exemplo oficial da doc de Scripts; e (c) geo e dispositivo saem de `FROM geographic_view` / `user_location_view` e de `segments.device`, ambos confirmados como existentes e segmentáveis por campanha. Os limites operacionais são folgados para o volume de um portfólio de afiliado: **30 minutos de execução** por run (60 em MCC com `executeInParallel` + callback), **relatórios não estão sujeitos a limites de entidade**, e o POST de saída via `UrlFetchApp` aceita **até 50 MB de payload** com headers customizados livres — mais do que suficiente para o token estático em header que o repo já usa. As três restrições reais a projetar em torno são: **granularidade mínima de agendamento é horária** (não há sub-hora); **linhas com métricas zeradas não são retornadas quando há segmentação**, então dia sem gasto = ausência de linha, não zero; e **termos de pesquisa abaixo do limiar de privacidade são omitidos** do `search_term_view` por design, com os cliques deles ainda contando no total da campanha — o que impede reconciliação exata entre grão (a) e grão (b).

---

## 1. Os três grãos são extraíveis via Ads Scripts?

### 1.0 Base: Ads Scripts expõe GAQL completo

A doc de Scripts é explícita: *"The reporting infrastructure is backed by the Google Ads API and uses GAQL to specify what fields, metrics, and conditions you want to set"* ([concepts/reports](https://developers.google.com/google-ads/scripts/docs/concepts/reports)).

Há dois mecanismos, que **aceitam as mesmas queries** e diferem só no formato de retorno ([concepts/reports](https://developers.google.com/google-ads/scripts/docs/concepts/reports)):

| Mecanismo | Retorno | Acesso ao campo | Observação da doc |
|---|---|---|---|
| `AdsApp.report(query, optArgs)` | representação plana, tipo dicionário | `row["campaign.id"]` | permite `exportToSheet()`; "some fields may not be available in this format" |
| `AdsApp.search(query, optArgs)` | `GoogleAdsRow` com campos aninhados | `row.campaign.id` | campos voltam em `lowerCamelCase` mesmo escritos em `underscore_case` na query |

A referência de `AdsApp.report` e `AdsApp.search` remete diretamente ao [guia GAQL](https://developers.google.com/google-ads/api/docs/query/overview) e à ["list of accessible resources and fields"](https://developers.google.com/google-ads/api/fields/latest/overview) da API — ou seja, **o catálogo de recursos disponível em Scripts é o catálogo da API**, não um subconjunto documentado à parte ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)).

Ponto crítico de limite: **"Reports are not subject to any entity limits."** ([limits](https://developers.google.com/google-ads/scripts/docs/limits)). Os tetos de 50.000 resultados por iterator e 10.000 IDs por selector valem para os *selectors* do AdsApp (`AdsApp.campaigns()` etc.), **não** para `report()`/`search()`.

---

### 1.a Performance de campanha por dia — ✅ extraível

Recurso: **`campaign`** ([campo v25](https://developers.google.com/google-ads/api/fields/v25/campaign)).

Segmentos confirmados na lista de `campaign`: `date`, `device`, `day_of_week`, `hour`, `month`, `week`, `geo_target_country`, `geo_target_region`, `geo_target_city`, `geo_target_metro`, `geo_target_most_specific_location`, entre outros ([campaign v25](https://developers.google.com/google-ads/api/fields/v25/campaign)).

Métricas confirmadas em `campaign`: `impressions`, `clicks`, `ctr`, `cost_micros`, `conversions`, `conversions_value`, `average_cpc`, `cost_per_conversion`, `all_conversions` ([campaign v25](https://developers.google.com/google-ads/api/fields/v25/campaign)).

`customer.id` é selecionável junto de `campaign` — o próprio exemplo da doc de Scripts faz isso ([concepts/reports](https://developers.google.com/google-ads/scripts/docs/concepts/reports)):

```sql
SELECT campaign.id, campaign.status, metrics.clicks, metrics.impressions, customer.id
FROM campaign
WHERE metrics.impressions > 0
```

Query sugerida para o grão (a):

```sql
SELECT
  customer.id,
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  segments.date,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value,
  metrics.average_cpc,
  metrics.cost_per_conversion
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
```

**Cuidado obrigatório com dinheiro:** em queries GAQL, `returnMoneyInMicros` **não é permitido** e *"all money values are represented in micros"* ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)). Ou seja, `metrics.cost_micros` sempre vem em micros — dividir por 1.000.000 no ingestor. O mesmo vale para `average_cpc` e `cost_per_conversion`.

**Cuidado obrigatório com dias zerados:** ver seção 6.2. Um dia sem impressões **não gera linha**.

---

### 1.b Termos de pesquisa — ✅ extraível (com perda estrutural por privacidade)

Recurso: **`search_term_view`** ([campo v25](https://developers.google.com/google-ads/api/fields/v25/search_term_view)). Este é o recurso usado no **exemplo oficial da própria doc de Scripts** ([concepts/reports](https://developers.google.com/google-ads/scripts/docs/concepts/reports)):

```javascript
let report = AdsApp.report(
        "SELECT " +
        " ad_group.id, search_term_view.search_term, metrics.ctr, metrics.cost_micros, metrics.impressions " +
        "FROM search_term_view " +
        "WHERE metrics.impressions < 10 AND segments.date DURING LAST_30_DAYS");
```

Campos do recurso: `search_term_view.search_term`, `search_term_view.status`, `search_term_view.ad_group`, `search_term_view.resource_name`. O campo `status` é um enum `ADDED | ADDED_EXCLUDED | EXCLUDED | NONE | UNKNOWN | UNSPECIFIED` e indica *"whether the search term is currently one of your targeted or excluded keywords"* ([search_term_view v25](https://developers.google.com/google-ads/api/fields/v25/search_term_view)) — exatamente o sinal que um ciclo de mineração de termos precisa.

**Recursos atribuídos (não segmentam métricas):** `ad_group`, `campaign`, `customer`. Portanto `campaign.id`, `campaign.name` e `customer.id` podem ser selecionados junto sem inflar as linhas ([search_term_view v25](https://developers.google.com/google-ads/api/fields/v25/search_term_view)).

**Segmentos disponíveis:** `date`, `device`, `day_of_week`, `week`, `month`, `keyword.info.match_type`, `keyword.info.text`, `keyword.ad_group_criterion`, `search_term_match_type`, `search_term_match_source`, `ad_network_type` ([search_term_view v25](https://developers.google.com/google-ads/api/fields/v25/search_term_view)).

Query diária sugerida:

```sql
SELECT
  customer.id,
  campaign.id,
  campaign.name,
  ad_group.id,
  search_term_view.search_term,
  search_term_view.status,
  segments.date,
  segments.keyword.info.match_type,
  segments.search_term_match_type,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.cost_micros,
  metrics.conversions
FROM search_term_view
WHERE segments.date DURING YESTERDAY
```

Para o **agregado semanal de aprendizado**, basta remover `segments.date` e usar um range: `WHERE segments.date BETWEEN "2026-08-10" AND "2026-08-16"`. Sem `segments.date` no SELECT, a API agrega o período inteiro por termo. O formato `BETWEEN "yyyy-MM-dd" AND "yyyy-MM-dd"` é o usado nos exemplos da própria referência de Scripts ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)); `segments.date` é documentado como *"yyyy-MM-dd format, for example, 2018-04-17"* ([campaign v25](https://developers.google.com/google-ads/api/fields/v25/campaign)).

**Limitação estrutural — limiar de privacidade.** A doc da API declara textualmente: *"Some search terms that do not have enough query activity are omitted from the search terms report to maintain our standards on data privacy. Clicks from these 'hidden' terms are included in the campaign total but are excluded from the search term reports (search_term_view and ai_max_search_term_ad_combination_view)"* ([AI Max reporting](https://developers.google.com/google-ads/api/docs/campaigns/ai-max-for-search-campaigns/ai-max-reporting)).

Consequência de projeto: **a soma de `cost_micros` do grão (b) nunca vai bater com o grão (a)**. Isso não é bug de ingestão. O Creator Engine deve tratar a diferença como uma métrica derivada legítima (ex.: "gasto em termos ocultos") e nunca usar o grão (b) como fonte de verdade de gasto total.

Existe um recurso complementar oficial para essa lacuna: **`campaign_search_term_insight`**, descrito como *"a high-level view of search demand at the campaign level by grouping similar search terms into categories and showing their search volume"*, com *"Historical data is available starting March 2023"* ([campaign_search_term_insight v25](https://developers.google.com/google-ads/api/fields/v25/campaign_search_term_insight)). Ele é acessível via GAQL, portanto também via Ads Scripts.

---

### 1.c Segmentos: localização e dispositivo — ✅ ambos extraíveis

#### Dispositivo

**`segments.device`** existe e é `Filterable: True, Selectable: True, Sortable: True`, com enum ([campaign v25](https://developers.google.com/google-ads/api/fields/v25/campaign)):

```
CONNECTED_TV | DESKTOP | MOBILE | OTHER | TABLET | UNKNOWN | UNSPECIFIED
```

Atenção: o enum tem **7 valores**, não 3. O modelo do Creator Engine precisa acomodar `CONNECTED_TV`, `OTHER`, `UNKNOWN` e `UNSPECIFIED` além de desktop/mobile/tablet, senão linhas serão descartadas silenciosamente.

`segments.device` está disponível em `campaign`, em `search_term_view`, em `geographic_view` e em `user_location_view` ([campaign](https://developers.google.com/google-ads/api/fields/v25/campaign), [search_term_view](https://developers.google.com/google-ads/api/fields/v25/search_term_view), [geographic_view](https://developers.google.com/google-ads/api/fields/v25/geographic_view), [user_location_view](https://developers.google.com/google-ads/api/fields/v25/user_location_view)).

Não existe um "device_view" separado — dispositivo é sempre um **segmento** aplicado a outro recurso. Query:

```sql
SELECT
  customer.id, campaign.id, campaign.name,
  segments.date, segments.device,
  metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
```

#### Localização / geo — os dois recursos existem e são diferentes

Ambos foram confirmados existentes em v25. A diferença está nas descrições oficiais:

**`geographic_view`** — *"Geographic View includes all metrics aggregated at the country level, one row per country. It reports metrics at either actual physical location of the user or an area of interest. If other segment fields are used, you may get more than one row per country."* ([geographic_view v25](https://developers.google.com/google-ads/api/fields/v25/geographic_view))

- Campos do recurso: `country_criterion_id`, `location_type`, `resource_name`
- `location_type` é o discriminador entre **localização física** e **área de interesse** (na API, `LOCATION_OF_PRESENCE` vs `AREA_OF_INTEREST`)

**`user_location_view`** — *"User Location View includes all metrics aggregated at the country level, one row per country. It reports metrics at the actual physical location of the user by targeted or not targeted location. If other segment fields are used, you may get more than one row per country."* ([user_location_view v25](https://developers.google.com/google-ads/api/fields/v25/user_location_view))

- Campos do recurso: `country_criterion_id`, `resource_name`, `targeting_location`
- `targeting_location` é `BOOLEAN` — *"Output only. Indicates whether location was targeted or not."*

**Escolha para o projeto:** `user_location_view` responde "de onde a pessoa realmente estava, e isso estava dentro do que eu segmentei?" — que é a pergunta de um afiliado querendo detectar vazamento de verba para geos não segmentadas. `geographic_view` responde "qual país, por presença física *ou* por interesse". Para o ciclo oportunidade/escala, **`user_location_view` com `targeting_location` é o mais acionável**; `geographic_view` é o mais comparável com o que a UI do Google Ads mostra por padrão.

**Como segmentar por campanha e abaixo de país:** ambos os recursos são "country level, one row per country" *por padrão*. Para descer de país:

- **Segmenting resources** de ambos: `ad_group`, `campaign` — *"Fields from the above resources, when selected along with this resource in your SELECT and WHERE clauses, will segment metrics"* ([geographic_view](https://developers.google.com/google-ads/api/fields/v25/geographic_view), [user_location_view](https://developers.google.com/google-ads/api/fields/v25/user_location_view)). Ou seja, selecionar `campaign.id` **quebra** as métricas por campanha — que é exatamente o desejado.
- **Segmentos geográficos disponíveis nos dois recursos:** `geo_target_airport`, `geo_target_canton`, `geo_target_city`, `geo_target_county`, `geo_target_district`, `geo_target_metro`, `geo_target_most_specific_location`, `geo_target_postal_code`, `geo_target_province`, `geo_target_region`, `geo_target_state` ([geographic_view](https://developers.google.com/google-ads/api/fields/v25/geographic_view), [user_location_view](https://developers.google.com/google-ads/api/fields/v25/user_location_view)).

Query sugerida para o grão (c) geo:

```sql
SELECT
  customer.id,
  campaign.id,
  campaign.name,
  segments.date,
  segments.device,
  user_location_view.country_criterion_id,
  user_location_view.targeting_location,
  segments.geo_target_region,
  segments.geo_target_city,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions
FROM user_location_view
WHERE segments.date DURING LAST_7_DAYS
```

**Cuidado com nomes de lugar (armadilha real):** os segmentos `geo_target_*` são do tipo `RESOURCE_NAME` — *"Resource name of the geo target constant that represents a city"* ([campaign v25](https://developers.google.com/google-ads/api/fields/v25/campaign)). Eles retornam algo como `geoTargetConstants/1001773`, **não** "São Paulo". Para resolver nomes:

1. Consultar o recurso **`geo_target_constant`**, que expõe `id`, `name`, `canonical_name` (*"The fully qualified English name, consisting of the target's name and that of its parent and country"*) e `country_code` (*"The ISO-3166-1 alpha-2 country code"*) ([geo_target_constant v25](https://developers.google.com/google-ads/api/fields/v25/geo_target_constant)). Recomendado: cachear essa tabela no Postgres do Creator Engine e resolver do lado do servidor, não a cada run do script.
2. Alternativa parcial: `AdsApp.report()` aceita a opção `resolveGeoNames` — *"Whether or not to convert Geo CriteriaIds (e.g. CountryCriteriaId and CityCriteriaId) into names (e.g. 'United States' and 'San Francisco'). Set to true if you want names. Defaults to true."* ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)). **Ambíguo:** ao contrário de `includeZeroImpressions` e `returnMoneyInMicros`, a doc **não** diz que `resolveGeoNames` é proibido em GAQL — mas também não confirma que funciona com GAQL. E `AdsApp.search()` **não** aceita essa opção: sua referência diz *"Currently, there is only one supported field: apiVersion"* ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)). Tratar como não-confiável e resolver via `geo_target_constant`.

---

## 2. Frequência de agendamento e timeout de execução

### 2.1 Timeout por execução — números exatos

Fonte: [limits](https://developers.google.com/google-ads/scripts/docs/limits)

| Contexto | Timeout |
|---|---|
| Script em conta de anunciante | *"can execute for a maximum of **30 minutes**, after which they will be cancelled"* |
| Ads Manager script (MCC), normal | *"can normally execute for a maximum of **30 minutes**"* |
| Ads Manager script com `executeInParallel` **e** callback | *"it can execute up to a maximum of **60 minutes** before being cancelled"* |

Nota importante da mesma página: *"All of the changes made before the script was cancelled will be applied."* Para um ingestor read-only isso significa: **um timeout no meio do run deixa o endpoint com ingestão parcial já commitada**. O endpoint do Creator Engine precisa ser idempotente por (conta, campanha, data) — upsert, nunca append cego.

A Central de Ajuda corrobora os mesmos números: *"Scripts that run for longer than 30 minutes — or 60 minutes for certain types of manager account scripts — will time out. If your script times out, not all of your changes may be completed."* ([support 188712](https://support.google.com/google-ads/answer/188712)).

### 2.2 Frequência máxima de agendamento — **horária**, com uma contradição na doc

Aqui as duas fontes primárias do Google **divergem**:

- **Central de Ajuda:** *"Once you've created a script, you can schedule it to run once, daily, weekly or monthly at a certain hour"* — a lista **não inclui hourly** ([support 188712](https://support.google.com/google-ads/answer/188712)).
- **Doc de desenvolvedor (developers.google.com):** instrui explicitamente, com "Hourly" capitalizado como nome de opção da UI, em pelo menos duas soluções oficiais:
  - *"Schedule the script to run **Hourly** in order to get the most out of alerting. If the alert is too noisy, scheduling it **Daily** around midday might also make sense."* ([Account Anomaly Detector](https://developers.google.com/google-ads/scripts/docs/solutions/account-anomaly-detector))
  - *"regardless of how often you want to launch a fresh analysis, schedule the script to run **Hourly**"* ([Link Checker](https://developers.google.com/google-ads/scripts/docs/solutions/link-checker))

**Leitura:** a opção **Hourly existe** na UI de agendamento — a doc de desenvolvedor não instruiria usar uma opção inexistente em duas soluções oficiais. O artigo da Central de Ajuda parece desatualizado/incompleto. **Sinalizo isto como ambiguidade documental**: recomendo confirmar visualmente na UI da conta antes de travar o design do ciclo.

**Frequência máxima prática: 1× por hora. Não existe agendamento sub-horário documentado, nem gatilho externo/webhook para disparar um script sob demanda** (ver seção 6.1).

### 2.3 Granularidade *dentro* do dia é possível sem sub-hora

Se o objetivo do agendamento horário for capturar movimento intradiário, note que existe o segmento **`segments.hour`** — *"Hour of day as a number between 0 and 23, inclusive"*, `Filterable/Selectable/Sortable: True`, disponível em `campaign` ([campaign v25](https://developers.google.com/google-ads/api/fields/v25/campaign)). Um único run diário pode trazer as 24 horas do dia anterior, em vez de 24 runs horários. Isso reduz drasticamente a pressão sobre cota e a superfície de falha.

**Ambíguo:** a doc não declara latência de disponibilidade dos dados (quanto tempo até as métricas de uma hora ficarem estáveis). Ver Lacunas.

---

## 3. Limites de `UrlFetchApp` dentro de Ads Scripts

A doc de Scripts **não publica números próprios**. Ela declara apenas: *"UrlFetchApp is fundamental to interacting with third-party APIs, however, there are quotas on its use, that you should be aware of when developing your solutions"* e linka para a página de cotas do Apps Script ([integrations/third-party-apis](https://developers.google.com/google-ads/scripts/docs/integrations/third-party-apis)). A página de limites de Scripts faz o mesmo: *"The underlying Google Apps Script services impose daily quotas and hard limits on some features"*, com link para o mesmo destino ([limits](https://developers.google.com/google-ads/scripts/docs/limits)).

O destino de ambos os links é [apps-script/guides/services/quotas](https://developers.google.com/apps-script/guides/services/quotas). Números exatos de lá:

### 3.1 Cotas diárias

| Feature | Contas consumidor (ex.: gmail.com) | Contas Google Workspace |
|---|---|---|
| **URL Fetch calls** | **20.000 / dia** | **100.000 / dia** |

### 3.2 Limites por chamada

| Feature | Valor (ambos os tipos de conta) |
|---|---|
| **URL Fetch POST size** | **50 MB / call** |
| **URL Fetch response size** | **50 MB / call** |
| **URL Fetch headers** | **100 / call** |
| **URL Fetch header size** | **8 KB / call** |
| **URL Fetch URL length** | **2 KB / call** |

### 3.3 Timeout de rede

Da referência do `UrlFetchApp` ([apps-script/reference/url-fetch/url-fetch-app](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)), parâmetro avançado de `fetch(url, params)`:

> `timeoutSeconds | Integer | The maximum time in seconds to wait for the request to complete. **The default is 360 (6 minutes).**`

Ou seja: **timeout de rede padrão de 360 s, configurável**. A mesma referência informa que a URL *"can have up to 2,082 characters"* — ligeiramente divergente do "2 KB / call" da página de cotas; **ambíguo**, mas irrelevante aqui porque o projeto usa POST com corpo, não query string.

### 3.4 Leitura para o projeto

- **50 MB de payload por POST é folgado por ordens de magnitude.** Um dia de search terms de um portfólio de afiliado dificilmente passa de alguns MB em JSON. Não há necessidade de chunking por tamanho.
- **O gargalo real não é tamanho, é tempo:** os 30 minutos de execução do script (seção 2.1) chegam antes de qualquer limite de UrlFetch.
- **"Número de chamadas por execução" não é limitado diretamente** — o limite documentado é *diário* (20.000/100.000). Não há teto por-run publicado. **Ambíguo**, mas com folga tão grande que não é restrição prática.
- ⚠️ **Ressalva importante sobre a aplicabilidade desta tabela.** A página de cotas do Apps Script lista também *"Script runtime | 6 min / execution"* — número que **comprovadamente não se aplica** a Ads Scripts, que têm 30/60 min próprios ([limits](https://developers.google.com/google-ads/scripts/docs/limits)). Isso prova que Ads Scripts **não herda a tabela inteira**. A doc de Scripts linka a tabela genericamente, sem dizer quais linhas valem. Portanto os números de UrlFetch acima devem ser tratados como **fortemente indicativos, não contratuais**. Ver Lacunas.
- **Ambíguo:** também não está documentado se a conta que conta cota é o e-mail que autorizou o script (o mais provável, dado que cotas do Apps Script são *"per user"*) ou a conta Google Ads. Isso importa em MCC — ver seção 4.4.

---

## 4. Script em nível de MCC vs script por conta

Fonte principal: [concepts/manager-scripts](https://developers.google.com/google-ads/scripts/docs/concepts/manager-scripts)

### 4.1 Quantas contas um script de MCC cobre

Há **dois modos**, com tetos muito diferentes:

**Modo sequencial (`AdsManagerApp.select`) — sem teto documentado de contas.**

> *"The accounts call retrieves the list of all client accounts under the manager account hierarchy by default."*

```javascript
const accountIterator = AdsManagerApp.accounts().get();
for (const account of accountIterator) {
  AdsManagerApp.select(account);
  // qualquer AdsApp.* agora se refere a esta conta
}
```

A doc afirma: *"After you select a client account, any further API calls apply to the client account until you explicitly select another account."* Não há limite publicado de contas neste modo — o limite efetivo é o **timeout de 30 minutos**.

**Modo paralelo (`executeInParallel`) — teto rígido de 50.**

> *"When using the `executeInParallel` method, a script can process up to **50** accounts."* ([limits](https://developers.google.com/google-ads/scripts/docs/limits))
>
> *"The `executeInParallel` method operates on a maximum of 50 accounts, so you'll have to implement your own restrictions to limit the number of accounts that your script retrieves."* ([manager-scripts](https://developers.google.com/google-ads/scripts/docs/concepts/manager-scripts))

Se o selector exceder 50, **uma exceção é lançada e nenhuma conta é processada** (comportamento all-or-nothing). Restringir com `.withLimit(50)` ou `.withIds([...])`.

### 4.2 Limites específicos de execução em MCC

| Limite | Valor | Fonte |
|---|---|---|
| Timeout normal | 30 min | [limits](https://developers.google.com/google-ads/scripts/docs/limits) |
| Timeout com `executeInParallel` + callback | 60 min | [limits](https://developers.google.com/google-ads/scripts/docs/limits) |
| Contas em paralelo | 50 | [limits](https://developers.google.com/google-ads/scripts/docs/limits) |
| Retorno de `processAccount` | **até 10 MB de dados** | [limits](https://developers.google.com/google-ads/scripts/docs/limits) |
| Cota por conta processada | *"Each account processed by an Ads Manager script gets its own quota as listed in the previous section"* | [limits](https://developers.google.com/google-ads/scripts/docs/limits) |

Restrições de seleção de contas ([manager-scripts](https://developers.google.com/google-ads/scripts/docs/concepts/manager-scripts)):

- *"Manager accounts cannot be retrieved if you have a multi-level hierarchy. Only the client accounts can be selected."*
- *"By default, closed, canceled, and suspended accounts are not returned. You can override this behavior by calling `withCondition` specifying a different filter for `customer_client.status`."* — relevante: uma conta suspensa some silenciosamente do feed. O Creator Engine deve distinguir "conta sem gasto" de "conta que sumiu do payload".

### 4.3 Como o payload identifica de qual conta veio cada linha

Há **três** caminhos, todos documentados:

**1. `customer.id` dentro da própria query GAQL** — o mais robusto, porque a identidade viaja junto com a linha e não depende do contexto de execução. Confirmado pelo exemplo oficial ([concepts/reports](https://developers.google.com/google-ads/scripts/docs/concepts/reports)):

```sql
SELECT campaign.id, campaign.status, metrics.clicks, metrics.impressions, customer.id
FROM campaign
WHERE metrics.impressions > 0
```

`customer` é **attributed resource** de `campaign`, `search_term_view`, `geographic_view` e `user_location_view` — ou seja, incluí-lo **não segmenta as métricas** ([search_term_view](https://developers.google.com/google-ads/api/fields/v25/search_term_view), [geographic_view](https://developers.google.com/google-ads/api/fields/v25/geographic_view)). É acréscimo grátis.

**2. `AdsApp.currentAccount().getCustomerId()`** — o contexto de execução corrente ([troubleshooting/execution-info](https://developers.google.com/google-ads/scripts/docs/troubleshooting/execution-info)):

```javascript
let accountId = AdsApp.currentAccount().getCustomerId();
```

A doc apresenta esse método justamente para o caso de *"the same unchanged script is used in multiple accounts"* — e nota que o objeto `Account` também expõe **moeda e fuso horário**, ambos críticos para o Creator Engine (comparar gasto entre contas em moedas diferentes, e saber a que fuso o `segments.date` se refere).

**3. `ExecutionResult.getCustomerId()`** — no callback do `executeInParallel` ([ExecutionResult](https://developers.google.com/google-ads/scripts/docs/reference/adsmanagerapp/adsmanagerapp_executionresult)):

> *"Returns the customer ID of the account. The returned value will be in the standard Google Ads format, e.g. `'123-456-7890'`."*

⚠️ **Formato divergente:** `getCustomerId()` retorna **com hífens** (`123-456-7890`), enquanto `customer.id` do GAQL retorna **INT64 sem hífens** (`1234567890`). Normalizar no endpoint, senão a mesma conta vira duas chaves.

O mesmo objeto expõe `getStatus()` com valores `OK` / `ERROR` / `TIMEOUT`, e `getError()`. **Isso é o mecanismo de observabilidade da ingestão em MCC**: o callback sabe exatamente quais contas falharam e pode postar um manifesto de execução para o Creator Engine reconciliar.

### 4.4 Recomendação de arquitetura para o projeto

Para um portfólio de afiliado (dezenas de contas, não milhares), o modo **sequencial** é preferível ao `executeInParallel`:

- Não tem o teto de 50 contas.
- Não tem o teto de 10 MB de retorno por conta — **importante**, porque no modo paralelo os dados precisariam voltar pelo `getReturnValue()` (string) antes de serem postados, ou cada `processAccount` faria seu próprio `UrlFetchApp`.
- POST direto por conta dentro do loop: cada conta vira uma requisição independente e idempotente. Uma conta que falha não derruba as outras.
- Trade-off: perde os 60 min (fica com 30). Mitigar particionando por conta/data e usando `segments.hour` ou janelas curtas em vez de backfills longos.

**Ambíguo e material:** a doc **não** esclarece se a cota diária de 20.000 URL Fetch calls é consumida por usuário autorizador (agregando todas as contas do MCC) ou por conta. Como cotas do Apps Script são descritas como *"per user"* ([apps-script quotas](https://developers.google.com/apps-script/guides/services/quotas)) mas a doc de Scripts diz que *"Each account processed by an Ads Manager script gets its own quota"* ([limits](https://developers.google.com/google-ads/scripts/docs/limits)), as duas afirmações estão em tensão. Ver Lacunas.

---

## 5. Autenticação do POST para endpoint externo

**Headers customizados arbitrários são suportados**, o que valida diretamente o padrão de token estático em header já existente no repo.

A referência do `UrlFetchApp` lista `headers` como parâmetro avançado de `fetch(url, params)`: *"a JavaScript key/value map of HTTP headers for the request"* ([apps-script/reference/url-fetch/url-fetch-app](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)). Não há allowlist de nomes de header na doc.

A doc de Scripts demonstra header de autorização customizado explicitamente ([integrations/third-party-apis](https://developers.google.com/google-ads/scripts/docs/integrations/third-party-apis)):

```javascript
const authHeader = 'Basic ' + Utilities.base64Encode(USERNAME + ':' + PASSWORD);
const options = {
  headers: {Authorization: authHeader}
}
// Include 'options' object in every request
const response = UrlFetchApp.fetch(API_URL, options);
```

E POST com JSON ([integrations/third-party-apis](https://developers.google.com/google-ads/scripts/docs/integrations/third-party-apis)):

```javascript
const options = {
  method: 'POST',
  contentType: 'application/json',
  payload: JSON.stringify(slackMessage)
};
UrlFetchApp.fetch(SLACK_URL, options);
```

Padrão recomendado para o Creator Engine:

```javascript
const options = {
  method: 'post',
  contentType: 'application/json',
  headers: {
    'X-CE-Token': INGEST_TOKEN,          // token estático, padrão já usado no repo
    'X-CE-Account': customerId,          // redundância de identidade
    'X-CE-Idempotency-Key': runKey       // (conta + grão + data + hash)
  },
  payload: JSON.stringify(batch),
  muteHttpExceptions: true,
  timeoutSeconds: 120
};
const response = UrlFetchApp.fetch(INGEST_URL, options);
if (response.getResponseCode() >= 400) { /* logar e sinalizar */ }
```

Notas de comportamento documentadas:

- **`muteHttpExceptions`**: *"If true the fetch doesn't throw an exception if the response code indicates failure, and instead returns the HTTPResponse. The default is false."* ([url-fetch-app](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)). A doc de Scripts mostra o padrão de checar `response.getResponseCode() >= 400` — *"Any status code greater or equal to 400 is either a client or server error"* ([integrations/third-party-apis](https://developers.google.com/google-ads/scripts/docs/integrations/third-party-apis)). **Usar sempre**, senão um 500 transitório do VPS aborta o script inteiro e perde as contas restantes.
- **`payload` como string vs objeto**: se `payload` for objeto JS, é interpretado como form-data (`application/x-www-form-urlencoded` ou `multipart/form-data`); se for string, vai como corpo ([url-fetch-app](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)). Para JSON, **sempre `JSON.stringify` + `contentType: 'application/json'`**.
- **`followRedirects`** default `true` e **`validateHttpsCertificates`** default `true` ([url-fetch-app](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)). Manter ambos no default — o endpoint está atrás do Traefik com TLS válido.
- **Escopo OAuth necessário**: `https://www.googleapis.com/auth/script.external_request` ([url-fetch-app](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)). Em Ads Scripts isso é concedido na autorização do script na UI, não configurado manualmente.

**Ambíguo — e vale um teste antes de travar o design:** a doc não declara se `UrlFetchApp` em Ads Scripts sai de uma faixa de IP estável/publicada. Portanto **não projete allowlist de IP** no Traefik como camada de autenticação; dependa do token no header. Ver Lacunas.

O guia também cobre OAuth 2.0 com client credentials caso o projeto queira evoluir do token estático ([integrations/third-party-apis](https://developers.google.com/google-ads/scripts/docs/integrations/third-party-apis)):

```javascript
const authUrlFetch = OAuth2.withClientCredentials(tokenUrl, clientId, clientSecret, optionalScope);
const response = authUrlFetch.fetch(url);
```

---

## 6. O que NÃO é extraível/possível via Ads Scripts

Importante separar **"não extraível"** (dado indisponível) de **"não operacionalizável"** (dado disponível, mas o modelo de execução impede). Para os três grãos, quase tudo cai na segunda categoria — e **a maior parte não é resolvida pela API oficial tampouco**.

### 6.1 Limitações do modelo de execução (não resolvidas por GAQL)

| Limitação | Evidência | Resolvido pela API oficial? |
|---|---|---|
| **Sem gatilho externo / on-demand.** Não há nada na doc que permita disparar um script via HTTP/webhook. O disparo é a UI de agendamento ou execução manual. | Ausência na doc; agendamento descrito apenas como ação de UI ([support 188712](https://support.google.com/google-ads/answer/188712)) | **Sim.** A API é chamada quando você quiser. |
| **Granularidade mínima de agendamento: 1 hora.** Sem sub-hora. | Opções são Hourly/Daily/Weekly/Monthly (ver seção 2.2) | **Sim.** |
| **Teto duro de 30 min por run** (60 em MCC paralelo). Backfills longos precisam ser fatiados e retomados entre runs. | [limits](https://developers.google.com/google-ads/scripts/docs/limits) | **Sim.** Sem esse teto. |
| **Sem retry/dead-letter nativo.** Se o POST falha, o dado daquele run se perde a menos que o próximo run reprocesse a janela. | Não há mecanismo documentado | **Sim**, se você mesmo construir. |
| **Timeout deixa estado parcial commitado.** *"All of the changes made before the script was cancelled will be applied."* | [limits](https://developers.google.com/google-ads/scripts/docs/limits) | Igual — mas você controla a transação. |
| **Sem query cross-account.** Cada conta exige `AdsManagerApp.select()` ou um `processAccount` próprio. Não há um `FROM` que atravesse contas. | [manager-scripts](https://developers.google.com/google-ads/scripts/docs/concepts/manager-scripts) | **Não.** A API também é por-customer. Empate. |
| **Contas gerenciadoras não recuperáveis em hierarquia multinível.** *"Only the client accounts can be selected."* | [manager-scripts](https://developers.google.com/google-ads/scripts/docs/concepts/manager-scripts) | **Sim.** `customer_client` na API expõe a hierarquia completa. |
| **Teto de 50 contas em `executeInParallel`.** | [limits](https://developers.google.com/google-ads/scripts/docs/limits) | **Sim.** |
| **Logging truncado em 100 Kb.** *"Logging output will be truncated at 100Kb."* Debug de ingestão grande fica cego. | [limits](https://developers.google.com/google-ads/scripts/docs/limits) | **Sim.** |

### 6.2 Limitações dos **dados** que afetam os três grãos (valem igualmente na API)

Estas são as que realmente importam para o modelo de dados do Creator Engine, e **nenhuma é resolvida migrando para a API oficial**:

**(i) Linhas zeradas somem quando há segmentação.**

> *"Zero metrics are always excluded when segmenting a report, provided all selected metrics are zero. [...] For example, if you segment a report by `segments.date`, metrics are broken down with one row for each date. **Dates with no metrics are not returned in such a report.**"* ([zero-impressions](https://developers.google.com/google-ads/api/docs/reporting/zero-impressions))

Como **todos os três grãos usam `segments.date`**, isso vale para todos. Uma campanha pausada por 3 dias produz um buraco no payload, não três linhas de zero. O Creator Engine **deve materializar o calendário do lado dele** e tratar ausência como zero — nunca como "sem dados". Confundir os dois quebra qualquer cálculo de média, tendência ou alerta de queda.

Reforço: a opção `includeZeroImpressions` do `AdsApp.report()` **não ajuda** — *"This field is not allowed when the query uses GAQL"* ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)).

**(ii) Termos de pesquisa abaixo do limiar de privacidade são omitidos.** Ver seção 1.b. Cliques deles contam no total da campanha mas não aparecem no `search_term_view` ([AI Max reporting](https://developers.google.com/google-ads/api/docs/campaigns/ai-max-for-search-campaigns/ai-max-reporting)). **Grão (a) e grão (b) nunca reconciliam.**

**(iii) Geo é agregado a país por padrão.** Ambos `geographic_view` e `user_location_view` retornam *"one row per country"* salvo se você adicionar segmentos geográficos mais finos ([geographic_view](https://developers.google.com/google-ads/api/fields/v25/geographic_view), [user_location_view](https://developers.google.com/google-ads/api/fields/v25/user_location_view)).

**(iv) Dinheiro sempre em micros com GAQL.** ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp))

**(v) Nomes geográficos vêm como resource names**, exigindo join com `geo_target_constant`. Ver seção 1.c.

### 6.3 O que *é* exclusivo da API oficial e custa developer token

Vale registrar o custo real do caminho alternativo, já que a decisão está travada: *"A developer token is a prerequisite to making Google Ads API calls"*, obtido no API Center de uma manager account ([dev-token](https://developers.google.com/google-ads/api/docs/get-started/dev-token)).

**Nuance relevante para reavaliação futura:** a doc atual afirma que *"When you sign up for a developer token, you may be granted **Explorer Access** level by default. This lets you make calls against production accounts, but with certain restrictions."* ([dev-token](https://developers.google.com/google-ads/api/docs/get-started/dev-token)). Ou seja, a premissa "a API exige aprovação da Google" é **parcialmente desatualizada** — existe hoje um nível de acesso concedido por padrão contra contas de produção. As restrições do Explorer Access não estão quantificadas nessa página. **A decisão de usar Scripts continua bem fundamentada** pelos motivos operacionais (zero infraestrutura de auth, zero credencial de longa duração no VPS, roda dentro da conta), mas o argumento "impossível sem aprovação" deve ser suavizado se a decisão for revisitada.

### 6.4 Veredito para os três grãos

**Nenhum dos três grãos exige a API oficial.** As diferenças Scripts↔API são todas de *orquestração* (gatilho, duração, retry, observabilidade), não de *disponibilidade de dado*. Como o Creator Engine apenas lê e recomenda — sem escrita de volta e sem requisito de latência sub-horária — Ads Scripts cobre o caso de uso integralmente.

---

## 7. Cotas globais relevantes

Fonte: [limits](https://developers.google.com/google-ads/scripts/docs/limits), salvo indicação.

| Cota | Valor | Observação |
|---|---|---|
| **Scripts autorizados por conta** | **250** | *"Each account has a limit of 250 authorized scripts. Beyond that limit, one of the previously authorized scripts will be deauthorized. This is only temporary, and the script can be reauthorized the next time it is opened."* |
| **Número máximo de scripts por conta** | **não documentado** | O 250 acima é limite de *autorização OAuth2*, não de scripts existentes. Ver Lacunas. |
| **Execuções por dia** | **não documentado** | Ver Lacunas. |
| Tempo de execução | 30 min (60 em MCC paralelo com callback) | Seção 2.1 |
| Resultados por iterator | 50.000 (default, ajustável com `withLimit()`) | **Não se aplica a reports** |
| IDs por selector | 10.000 (`selector.withIds()`); acima disso, runtime error | **Não se aplica a reports** |
| **Limites de entidade em reports** | **nenhum** | *"Reports are not subject to any entity limits."* |
| Logging | truncado em 100 Kb | *"A warning will be logged if that happens."* |
| Contas em `executeInParallel` | 50 | |
| Retorno de `processAccount` | 10 MB | |
| URL Fetch calls/dia | 20.000 (consumidor) / 100.000 (Workspace) | [apps-script quotas](https://developers.google.com/apps-script/guides/services/quotas) — aplicabilidade parcial, ver 3.4 |
| Bulk upload | 50 MB, 1 milhão de linhas, timeout de 2 h | Irrelevante (projeto é read-only) |

**Mitigação oficial para teto de tempo**, textual na doc: *"To get around the 'Exceeded maximum execution time' error, you can reschedule your script under multiple user accounts to extend the script's quota."* ([limits](https://developers.google.com/google-ads/scripts/docs/limits)). Isso confirma indiretamente que **cota é contabilizada por usuário autorizador**, o que reforça a tensão apontada em 4.4.

Aviso da própria página, que deve entrar como premissa de projeto: *"These limits can change at any time without warning, so ensure that your scripts are flexible and contain error handling."*

---

## Lacunas — o que a documentação não responde

Itens abaixo **não** foram encontrados em fonte primária. Nenhum é bloqueante, mas cada um exige teste empírico ou decisão defensiva.

1. **Número máximo de scripts por conta.** Nem [limits](https://developers.google.com/google-ads/scripts/docs/limits), nem [support 188712](https://support.google.com/google-ads/answer/188712), nem [About your Google Ads account limits](https://support.google.com/google-ads/answer/6372658) mencionam teto de scripts. O único número é o de **250 scripts autorizados** — que é limite de OAuth, não de existência. Assumir folga, mas não depender de dezenas de scripts.

2. **Execuções por dia.** Nenhum teto documentado. Com agendamento horário, o piso implícito é 24/dia por script. Não confirmado se há throttling adicional.

3. **Conflito documental sobre a opção "Hourly".** A Central de Ajuda lista *"once, daily, weekly or monthly"* ([support 188712](https://support.google.com/google-ads/answer/188712)) enquanto duas soluções oficiais de desenvolvedor mandam agendar "Hourly" ([anomaly detector](https://developers.google.com/google-ads/scripts/docs/solutions/account-anomaly-detector), [link checker](https://developers.google.com/google-ads/scripts/docs/solutions/link-checker)). **Confirmar na UI antes de travar o ciclo.**

4. **Quais linhas da tabela de cotas do Apps Script realmente se aplicam a Ads Scripts.** Prova de que não é herança integral: *"Script runtime | 6 min / execution"* está lá, mas Ads Scripts tem 30/60 min. A doc de Scripts linka a tabela sem qualificar. Os números de UrlFetch são o melhor dado disponível, mas **não são contratuais para Ads Scripts**.

5. **Unidade de contabilização da cota de UrlFetch em MCC.** *"Each account processed by an Ads Manager script gets its own quota"* ([limits](https://developers.google.com/google-ads/scripts/docs/limits)) vs. cotas do Apps Script descritas como *"per user"* ([quotas](https://developers.google.com/apps-script/guides/services/quotas)). **Contraditório.** Medir empiricamente se o MCC crescer.

6. **`resolveGeoNames` funciona com GAQL?** A doc marca `includeZeroImpressions` e `returnMoneyInMicros` como proibidos em GAQL, mas silencia sobre `resolveGeoNames` ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)). E `AdsApp.search()` não aceita a opção. **Não depender dela**; resolver via `geo_target_constant`.

7. **Latência/freshness dos dados.** Não documentado quanto tempo após o fim de um dia (ou de uma hora, via `segments.hour`) as métricas ficam estáveis. Isso determina se a janela de ingestão deve ser `YESTERDAY` ou `LAST_3_DAYS` com re-upsert. **Recomendação defensiva:** re-ingerir uma janela móvel de 3 dias e fazer upsert, absorvendo revisões retroativas (especialmente conversões, que têm lag por natureza).

8. **Retenção histórica do `search_term_view`.** Não encontrado teto de lookback para backfill. (Registrado apenas para `campaign_search_term_insight`: *"Historical data is available starting March 2023"* — [campaign_search_term_insight](https://developers.google.com/google-ads/api/fields/v25/campaign_search_term_insight).) Testar o alcance real antes de planejar o backfill.

9. **Faixa de IP de saída do `UrlFetchApp`.** Não publicada. **Não usar allowlist de IP no Traefik como autenticação**; depender do token em header.

10. **Validação final das queries.** As páginas de campos avisam: *"when you specify [recurso] in the FROM clause, some metrics and segments cannot be used"* ([geographic_view](https://developers.google.com/google-ads/api/fields/v25/geographic_view)). A combinação exata de campos das queries propostas aqui foi montada a partir das listas filtradas por FROM, mas **deve ser validada rodando cada query uma vez** (o "Query Validator"/"Help me build a query" da doc de campos, ou um run em preview) antes de ir para produção.

11. **Precedência de versão da API.** `apiVersion` *"Defaults to the most recent supported version"* e *"Sunsetted versions are not allowed"* ([AdsApp](https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp)). Não documentado quanto aviso prévio há antes de um sunset quebrar um script fixado. **Recomendação:** não fixar `apiVersion`, deixar no default, e monitorar as [datas de sunset](https://developers.google.com/google-ads/api/docs/sunset-dates).

---

## Anexo — checklist de decisões derivadas desta pesquisa

- [ ] Sempre incluir `customer.id` no SELECT dos três grãos (grátis, não segmenta).
- [ ] Normalizar customer id: GAQL retorna sem hífen, `getCustomerId()` retorna com hífen.
- [ ] Dividir todo `*_micros` por 1.000.000 no ingestor.
- [ ] Materializar calendário no Postgres; ausência de linha = zero, não "sem dados".
- [ ] Modelar `segments.device` com os 7 valores do enum, não 3.
- [ ] Cachear `geo_target_constant` para resolver nomes; não confiar em `resolveGeoNames`.
- [ ] Endpoint idempotente por (conta, grão, data) — timeout deixa estado parcial.
- [ ] `muteHttpExceptions: true` + checar `getResponseCode() >= 400` no script.
- [ ] Janela móvel de 3 dias com upsert, para absorver revisão de conversões.
- [ ] Preferir loop sequencial (`AdsManagerApp.select`) a `executeInParallel` — sem teto de 50 contas nem de 10 MB.
- [ ] Nunca reconciliar gasto do grão (b) com o grão (a); a diferença é o limiar de privacidade.
- [ ] Postar manifesto de execução (contas OK/ERROR/TIMEOUT) para o Creator Engine detectar contas faltantes.
