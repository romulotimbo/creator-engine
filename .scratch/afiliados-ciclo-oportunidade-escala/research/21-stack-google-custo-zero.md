# Stack Google de custo zero para sinal híbrido de demanda de busca

**Data da pesquisa:** 2026-08-21
**Escopo:** viabilidade de obter (a) volume absoluto por keyword/geo e (b) índice relativo de tendência, usando apenas fontes oficiais e gratuitas do Google.
**Regra de evidência:** toda afirmação factual abaixo cita URL de fonte primária (`developers.google.com`, `support.google.com`, `policies.google.com`, blogs oficiais do Google, `learn.microsoft.com` para Bing). Onde só há fonte secundária, está marcado **NÃO CONFIRMADO**.

---

## Veredito

**GO parcial, mas o desenho assumido no projeto está errado em dois pontos estruturais e precisa ser refeito.** (1) **Google Ads Scripts NÃO alcança Keyword Planner — este caminho está definitivamente morto**, não por limitação de cota mas por ausência de superfície: nenhum serviço de keyword planning existe no `AdsApp`, e os recursos GAQL `keyword_plan*` contêm apenas configuração de plano (texto, lance, match type) e **zero métricas de volume**; os métodos que geram volume vivem no `KeywordPlanIdeaService`, um RPC que nem `AdsApp.search()` nem `AdsApp.mutate()` conseguem invocar. (2) **Explorer Access bloqueia explicitamente o `KeywordPlanIdeaService`** — a metade "volume absoluto" do sinal exige subir para **Basic Access** *e*, além disso, ter a permissible use "Researching keywords and recommendations" concedida (são dois gates independentes, ambos por revisão humana, ambos gratuitos). A metade "índice relativo" está **descoberta**: a Google Trends API oficial existe, mas segue em alpha fechado por aplicação desde 2025-07-24 (~13 meses sem mudança de status ou post de follow-up), com a documentação de endpoints/quotas retornando 404 para quem não foi aceito; e a principal biblioteca não-oficial (`pytrends`) foi **arquivada pelo dono em 2025-04-17**. Portanto: **fica coberto** — volume absoluto mensal com 4 anos de profundidade por geo, gratuito, após aprovação de Basic Access (prazo nominal 5 dias úteis, com backlog admitido pela própria Google em 2026-02); **fica descoberto** — o índice de aceleração diário/semanal, para o qual não existe hoje nenhum caminho oficial e gratuito acessível sob demanda. O substituto gratuito e oficial mais próximo para timing é a **Bing Webmaster Tools API (`GetKeywordStats`)**, que devolve série temporal de impressões absolutas por query/país/idioma sem custo — é sinal de outro motor de busca, mas é oficial, documentado e imediatamente acessível.

---

## Pergunta 1 — Explorer Access cobre Keyword Planner em contas de produção?

### 1.1 Resposta direta: **NÃO.**

`KeywordPlanIdeaService` está na lista de serviços restritos do Explorer Access, textualmente.

> "Explorer Access level restricts access to the following features. If you need to use these features, you need to apply for Basic Access level or Standard Access level."

A tabela "Restricted Functionality / Restricted Services and Methods" lista, sob a linha **Planning**:

> `KeywordPlanService`, `KeywordPlanIdeaService`, `KeywordPlanCampaignService`, `KeywordPlanCampaignKeywordService`, `KeywordPlanAdGroupService`, `KeywordPlanAdGroupKeywordService`, `AudienceInsightsService`, `ReachPlanService`

Fonte: <https://developers.google.com/google-ads/api/docs/access-levels> (página com carimbo "Last updated 2026-08-19 UTC").

Isso cobre **os dois métodos perguntados** — `GenerateKeywordHistoricalMetrics` e `GenerateKeywordIdeas` — porque ambos pertencem ao `KeywordPlanIdeaService`, que é o serviço inteiro bloqueado. A lista de métodos do serviço em v25 é `GenerateAdGroupThemes`, `GenerateKeywordForecastMetrics`, `GenerateKeywordHistoricalMetrics`, `GenerateKeywordIdeas` — fonte: <https://developers.google.com/google-ads/api/reference/rpc/v25/KeywordPlanIdeaService>.

A restrição é **do developer token, não da conta**. Ter conta de produção com gasto real não altera nada: o Explorer já permite bater em contas de produção, e mesmo assim o serviço está bloqueado.

Confirmação independente no blog oficial que anunciou o nível (2025-10-28, terça-feira):

> "To limit abuse, developer tokens with Explorer Access will have some restrictions on functionality, such as creating new advertiser accounts and **keyword planning**."

Fonte: <https://ads-developers.googleblog.com/2025/10/explorer-access-is-now-available-for.html>

### 1.2 Os níveis de acesso que existem hoje (nomes exatos)

São **quatro**, não três (a "Page Summary" gerada automaticamente na mesma página diz "three access levels" e está desatualizada/inconsistente com a tabela logo abaixo — **ambiguidade da própria documentação**, registrada aqui e não resolvida).

| Nível (nome exato) | Pode acessar | Limite diário de operações | Como se obtém | Prazo de revisão |
|---|---|---|---|---|
| **Test Account Access level** | Somente contas de teste | 15.000 operações/dia | Sign-up inicial | Automático |
| **Explorer Access level** | Contas de teste **e de produção** | **2.880 operações/dia** em produção; 15.000/dia em teste | Automático ao concluir o onboarding | Automático |
| **Basic Access level** | Teste e produção | 15.000 operações/dia em ambos | Aplicação | **5 dias úteis** |
| **Standard Access level** | Teste e produção | **Ilimitado** em ambos | Aplicação | **10 dias úteis** |

Fonte: <https://developers.google.com/google-ads/api/docs/access-levels>

Nota de rodapé literal sobre a janela:

> "'Per day' is based on a sliding 24 hour time period in which API requests were made with your developer token. Your application will receive an error if it exceeds the request limit for your access level within the last 24 hours."

Sobre o nível concedido por padrão, a documentação e o blog **divergem em aparência**:
- A página de access levels diz: *"After you've completed the initial sign-up for the Google Ads API, you're issued a developer token with the Test Account Access level."*
- O blog de 2025-10-28 diz: *"Most new developers who sign for the Google Ads API will immediately be given Explorer Access level upon completing onboarding steps."*
- A página de dev token diz que ao concluir, o token recebe **Explorer Access (Approved)** ou **Test Account Access (Pending Approval)** — <https://developers.google.com/google-ads/api/docs/get-started/dev-token>

Leitura conciliadora: o sign-up inicial emite Test Account Access e o onboarding completo promove automaticamente para Explorer, mas **a documentação não é explícita sobre o gatilho exato**. Para efeito prático isso não muda nada: **nenhum dos dois estados dá Keyword Planner**.

### 1.3 O segundo gate que o projeto não estava considerando: "Permissible use"

Este é o achado mais importante da Pergunta 1 depois da restrição do Explorer. Access level e permissible use são **duas dimensões independentes** do mesmo token:

> "Each Google Ads API developer token is assigned an access level and 'permissible use.' The access level determines whether you can affect production accounts and the number of operations and requests that you can execute daily. **Permissible use determines the specific Google Ads API features that the developer token is allowed to use.**"

E, crucialmente:

> "Permissible use only applies to developer tokens with Basic Access and Standard Access levels. Permissible use is allocated based on intended use of the Google Ads API."

A tabela de permissible use tem três linhas, e a terceira é a que interessa:

| Permissible Use | Description (verbatim) |
|---|---|
| Ad creation / management | "Provide access to all services of the API for creating and managing Google Ads campaigns, ad groups, ads, and keywords." |
| Reporting | "Only make `GoogleAdsService.Search` or `GoogleAdsService.SearchStream` requests, or read-only calls. This is for developers who only use the API to request stats." |
| **Researching keywords and recommendations** | "Allow the developer token to access `RecommendationService`, `KeywordPlanIdeaService`, and `KeywordPlanService`. **This is only used by tools requiring suggestions to help facilitate the creation and management of Google Ads campaigns.**" |

Fonte: <https://developers.google.com/google-ads/api/docs/access-levels>

**Implicação operacional:** subir para Basic Access é necessário mas **pode não ser suficiente**. Se a aplicação for aprovada com permissible use "Reporting" (que é o que uma descrição de caso de uso do tipo "quero puxar meus dados de campanha" naturalmente sugere), o `KeywordPlanIdeaService` continua fechado. A aplicação precisa pedir explicitamente **"Researching keywords and recommendations"**.

Atenção à última frase da descrição: o uso é enquadrado como *"tools requiring suggestions to help facilitate the creation and management of Google Ads campaigns"*. Um radar de oportunidade puramente de pesquisa de mercado, desacoplado da criação de campanhas, **é um enquadramento mais frágil** do que "ferramenta interna que seleciona keywords para as campanhas que eu de fato rodo". O operador roda campanhas reais, então o enquadramento correto existe — mas a documentação **não define critérios objetivos de aprovação**, e isso é subjetivo do revisor.

Existe formulário para trocar permissible use depois: *"If your developer token has been approved for either the Basic Access level or Standard Access level, you can fill out the application to update permissible use."* — mesma fonte.

### 1.4 Limites exatos por nível e como o Keyword Planner conta

**Contagem de operações (regra geral):**

> "A `Search` or `SearchStream` request counts as one operation against the user's daily operation quota. One `SearchStream` request counts as one API operation irrespective of the number of batches."

Fonte: <https://developers.google.com/google-ads/api/docs/best-practices/quotas>

Ou seja, uma query GAQL que devolve 50.000 linhas custa **1 operação**. O orçamento de 2.880/dia do Explorer é folgado para ingestão de performance/search terms.

**O Keyword Planner NÃO é limitado pelo teto diário — é limitado por QPS separado.** A mesma página documenta limites por serviço, justificados por "cost and complexity":

| Método | Limite |
|---|---|
| `GenerateKeywordIdeas` | **1 QPS por CID** |
| `GenerateKeywordHistoricalMetrics` | **1 QPS por CID** |
| `GenerateKeywordForecastMetrics` | **1 QPS por CID** |
| `GenerateAdGroupThemes` | 2 QPS por CID |
| `AudienceInsightsService.GenerateTargetingSuggestionMetrics` | 2 QPS por developer token |

> "1 QPS is calculated as 60 requests per 60 seconds."

Violação retorna `RESOURCE_EXHAUSTED`. Fonte: <https://developers.google.com/google-ads/api/docs/best-practices/quotas>

**Máximos de objetos de keyword planning** (relevantes só se você criar planos salvos, o que — ver §2.3 — não é necessário):

| Recurso | Limite |
|---|---|
| `KeywordPlan` por conta | 10.000 |
| `KeywordPlanAdGroupKeyword` por plano | 10.000 |
| `KeywordPlanAdGroup` por plano | 200 |
| `KeywordPlanCampaignKeyword` (negativas) | 1.000 |
| `KeywordPlanCampaign` por plano | 1 |

Fonte: <https://developers.google.com/google-ads/api/docs/best-practices/quotas>; corroborado nas próprias páginas de recurso: *"Max number of saved keyword plans: 10000"* (<https://developers.google.com/google-ads/api/fields/v25/keyword_plan>) e *"Max number of keyword plan keywords per plan: 10000"* (<https://developers.google.com/google-ads/api/fields/v25/keyword_plan_ad_group_keyword>).

**Dimensionamento para a escala do projeto (150 kw semanais + 50 kw diárias, 3 geos):** ver §1.6 — cabe com folga enorme.

### 1.5 Existe requisito de gasto mínimo?

**Para a API: nenhum documentado.** Varri a documentação de access levels, dev token e RMF e **não há qualquer menção a gasto mínimo, faturamento mínimo ou campanhas ativas** como pré-requisito para Basic Access ou para o permissible use de keyword research.
- <https://developers.google.com/google-ads/api/docs/access-levels>
- <https://developers.google.com/google-ads/api/docs/get-started/dev-token>
- <https://developers.google.com/google-ads/api/docs/api-policy/rmf>

O RMF (Required Minimum Functionality), aliás, **não se aplica ao Basic**: *"Note that RMF only applies to developer tokens with Standard Access level."* — <https://developers.google.com/google-ads/api/docs/api-policy/rmf>. Isso simplifica o caminho: para Basic você não precisa provar que construiu uma ferramenta completa de criação/gestão.

**Para a UI: há um requisito, mas é de billing, não de gasto.** A página oficial do Keyword Planner diz duas vezes:

> "You must complete your account setup by entering your billing information to access basic features like 'Get ideas for new keywords'."

> "You must enter your billing information and complete your account setup to access basic features like keyword suggestions."

Fonte: <https://support.google.com/google-ads/answer/7337243>

Isso é **informação de pagamento cadastrada**, não um patamar de gasto. O operador já tem conta com gasto real, então esse gate já está vencido.

**Sobre a faixa "1K–10K" em vez de números exatos — a documentação oficial NÃO explica isso.** O que a documentação oficial diz sobre precisão é apenas:

> "Your search volume statistics are rounded."

> "The average number of times people have searched for a keyword and its close variants based on the month range as well as the location and Search Network settings you selected."

> "Keep in mind that historical stats like average monthly searches are only shown for exact matches."

Fonte: <https://support.google.com/google-ads/answer/3022575>

**Não encontrei em nenhuma fonte primária do Google a regra que liga faixas bucketizadas a nível de gasto da conta.** A crença de que "conta com pouco gasto vê faixas" circula amplamente em threads da Google Ads Community — que são **conteúdo gerado por usuários, não documentação oficial**, e portanto **NÃO CONFIRMADO**. Exemplos dessas threads (citados apenas como evidência de que o fenômeno é relatado, não como fonte de fato): <https://support.google.com/google-ads/thread/381084048/keyword-planner-showing-ranges-instead-of-exact-search-volume-even-ad-campaign-are-live>, <https://support.google.com/google-ads/thread/335365920/keyword-planner-isn-t-showing-exact-search-volume-but-the-google-ads-account-has-funds>.

**E se isso vale para a API, a documentação é silenciosa.** O tipo de retorno `avg_monthly_searches` é `int64` (não um enum de faixa nem um par min/max), o que sugere um número único — mas **o schema não impede que esse número seja o ponto médio de um bucket**. Não há statement oficial. **Isto só pode ser resolvido empiricamente, pelo operador logado, comparando a resposta da API com a UI na própria conta dele.** É a incerteza residual mais importante da Pergunta 1.

### 1.6 O que `GenerateKeywordHistoricalMetrics` retorna, exatamente

**Request** — `GenerateKeywordHistoricalMetricsRequest` (<https://developers.google.com/google-ads/api/reference/rpc/v25/GenerateKeywordHistoricalMetricsRequest>):

| Campo | Fato verbatim |
|---|---|
| `keywords[]` | "A maximum of **10,000 keywords** can be used." Também: "Not all inputs will be returned as a result of near-exact deduplication. For example, if stats for 'car' and 'cars' are requested, only 'car' will be returned." |
| `geo_target_constants[]` | "The resource names of the location to target. **Maximum is 10.** An empty list MAY be used to specify all targeting geos." |
| `language` | resource name do idioma; "If not set, all keywords will be included." |
| `keyword_plan_network` | "If not set, Google Search And Partners Network will be used." |
| `include_adult_keywords` | "If true, adult keywords will be included in response. **The default value is false.**" |
| `historical_metrics_options` | ver abaixo |
| `aggregate_metrics` | `KeywordPlanAggregateMetrics` |
| `customer_id` | ID do cliente |

> ⚠️ **`include_adult_keywords` default `false` é uma armadilha direta para o nicho nutra.** Termos de emagrecimento/desempenho podem ser classificados como adulto e sumir silenciosamente da resposta. Setar `true` explicitamente.

**Profundidade e granularidade** — `HistoricalMetricsOptions.year_month_range` (<https://developers.google.com/google-ads/api/reference/rpc/v25/HistoricalMetricsOptions>):

> "The year month range for historical metrics. **If not specified, metrics for the past 12 months are returned. Search metrics are available for the past 4 years.** If the search volume is not available for the entire year_month_range provided, the subset of the year month range for which search volume is available are returned."

Ou seja: **granularidade mensal, profundidade máxima 4 anos**, default 12 meses. O `include_average_cpc` existe mas: "Average CPC is provided only for legacy support."

**Response** — `GenerateKeywordHistoricalMetricsResponse` → `results[]` de `GenerateKeywordHistoricalMetricsResult` = `{ text, close_variants[], keyword_metrics }` (<https://developers.google.com/google-ads/api/reference/rpc/v25/GenerateKeywordHistoricalMetricsResult>).

**Campos de `KeywordPlanHistoricalMetrics`** (<https://developers.google.com/google-ads/api/reference/rpc/v25/KeywordPlanHistoricalMetrics>), descrições verbatim:

| Campo | Tipo | Descrição oficial |
|---|---|---|
| `avg_monthly_searches` | int64 | "Approximate number of monthly searches on this query, averaged for the past 12 months." |
| `monthly_search_volumes[]` | `MonthlySearchVolume` | "Approximate number of searches on this query for the past twelve months." |
| `competition` | enum | "The competition level for the query." |
| `competition_index` | int64 | "The competition index for the query in the range [0, 100]. Shows how competitive ad placement is for a keyword. The level of competition from 0-100 is determined by the number of ad slots filled divided by the total number of ad slots available. **If not enough data is available, null is returned.**" |
| `low_top_of_page_bid_micros` | int64 | "Top of page bid low range (**20th percentile**) in micros for the keyword." |
| `high_top_of_page_bid_micros` | int64 | "Top of page bid high range (**80th percentile**) in micros for the keyword." |
| `average_cpc_micros` | int64 | "Average Cost Per Click in micros for the keyword." |

`MonthlySearchVolume` = `{ year: int64, month: MonthOfYear, monthly_searches: int64 }`, com: *"A null value indicates the search volume is unavailable for that month."* — <https://developers.google.com/google-ads/api/reference/rpc/v25/MonthlySearchVolume>

> ⚠️ Note a **contradição interna na documentação**: a descrição de `monthly_search_volumes[]` diz "past twelve months", mas `HistoricalMetricsOptions` diz que se pode pedir até 4 anos via `year_month_range`. A leitura razoável é que a descrição do campo descreve o comportamento *default* e não foi atualizada. **É ambíguo e não vou escolher uma leitura** — precisa ser verificado empiricamente com uma chamada real pedindo 48 meses.

**Ausência crítica: a resposta NÃO tem dimensão de geo.** `GenerateKeywordHistoricalMetricsResult` tem apenas `{text, close_variants, keyword_metrics}`. Os até 10 `geo_target_constants` do request são portanto **agregados em um único número**, não quebrados por geo. **Para ter volume por geo é obrigatório uma requisição por geo.**

**Dimensionamento para a escala do projeto:**
- 150 keywords × 3 geos, semanal → 3 requisições/semana (150 kw cabem folgadamente no teto de 10.000/request; o que força a separação é o geo, não o volume de keywords).
- 50 keywords × 3 geos, diário → 3 requisições/dia.
- Total ≈ **24 requisições/semana**, contra um teto de 15.000 operações/dia no Basic e 1 QPS. **Folga de três ordens de grandeza.** O gargalo do projeto é 100% de aprovação/permissão, zero de cota.

**Para completar, `GenerateKeywordIdeas` tem limites bem mais apertados** (relevante se for usado para descobrir termos novos por produto): *"Maximum of 20 seed keywords per request"*, *"Exactly 1 URL or domain per request"*, e retorna *"up to 700 keyword ideas by default"* — <https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas>.

---

## Pergunta 2 — Google Ads Scripts alcança dados de Keyword Planner?

### 2.1 Resposta direta: **NÃO, por três bloqueios independentes.** Nenhum contornável.

### 2.2 Não existe serviço de keyword planning exposto ao Scripts

Baixei e varri a referência completa do objeto `AdsApp` (<https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp>). A busca por `keywordplan`, `keyword plan`, `KeywordIdea`, `search volume` e `TargetingIdea` no texto integral da página retorna **zero ocorrências**.

A superfície completa do `AdsApp` é: `adAssets`, `adGroupTargeting`, `adGroups`, `adParams`, `ads`, `biddingStrategies`, `budgetOrders`, `budgets`, `bulkUploads`, `campaigns`, `createLabel`, `currentAccount`, `display`, `drafts`, `excludedPlacementLists`, `experiments`, `extensions`, `getExecutionInfo`, `keywords`, `labels`, `mutate`, `mutateAll`, `negativeKeywordLists`, `newExcludedPlacementListBuilder`, `newExperimentBuilder`, `newNegativeKeywordListBuilder`, `performanceMaxCampaigns`, `productAds`, `productGroups`, `recommendations`, `report`, `search`, `shoppingAdGroupTargeting`, `shoppingAdGroups`, `shoppingCampaignTargeting`, `shoppingCampaigns`, `targeting`, `userlists`, `videoAdGroups`, `videoAds`, `videoCampaigns`, `videoTargeting`.

`AdsApp.keywords()` devolve *"the selector of all keywords in the account"* — são as keywords **que já existem nas suas campanhas**, com métricas de performance (impressões, cliques, custo). Não é pesquisa de mercado, não tem volume de busca.

A própria descrição do objeto raiz confirma o escopo: *"Root object of Google Ads scripts API. Exposes methods for: Fetching Google Ads entities / Querying Google Ads reports / Accessing information about the state of the current execution."*

### 2.3 GAQL alcança os recursos `keyword_plan*` — mas eles não contêm métrica nenhuma

Este é o ponto que precisa ser entendido com precisão, porque a resposta superficial ("GAQL alcança `keyword_plan`?") é **sim**, e mesmo assim é inútil.

**Recursos GAQL relacionados a keyword planning que existem em v25** (varredura da referência de campos, <https://developers.google.com/google-ads/api/fields/v25/overview>) — são exatamente **cinco**, todos queryable:

1. `keyword_plan`
2. `keyword_plan_campaign`
3. `keyword_plan_campaign_keyword`
4. `keyword_plan_ad_group`
5. `keyword_plan_ad_group_keyword`

**O que eles contêm:**

`keyword_plan_ad_group_keyword` (<https://developers.google.com/google-ads/api/fields/v25/keyword_plan_ad_group_keyword>) — campos completos: `cpc_bid_micros`, `id`, `keyword_plan_ad_group`, `match_type`, `negative`, `resource_name`, `text`. **Todos categoria `ATTRIBUTE`. Nenhum `METRIC`.**

`keyword_plan` (<https://developers.google.com/google-ads/api/fields/v25/keyword_plan>) — campos completos: `forecast_period`, `id`, `name`, `resource_name`. Idem.

E a nota de "Attributed resources" em `keyword_plan_ad_group_keyword` diz que os recursos atribuídos são `customer`, `keyword_plan`, `keyword_plan_ad_group`, `keyword_plan_campaign` — e explicitamente: *"These fields will not segment metrics in your SELECT clause."*

**Conclusão:** esses recursos são o *espelho de leitura da configuração do plano* — quais keywords você colocou no plano, com que lance e match type. Volume de busca, competição e faixas de lance **não são campos GAQL em lugar nenhum da API**. Eles só existem como retorno de RPC do `KeywordPlanIdeaService`. Portanto `AdsApp.search()` — e `AdsApp.report()` — **nunca** alcançarão volume de busca, com qualquer query, em qualquer versão.

### 2.4 Scripts suporta mutates nesses recursos — mas a premissa do projeto está desatualizada

**Correção factual importante:** a premissa "no Google Ads API, gerar métricas de Keyword Planner exige criar um Keyword Plan (mutate) antes de consultar" **não é mais verdadeira**.

Em v25, `KeywordPlanService` tem **um único método**: `MutateKeywordPlans` (<https://developers.google.com/google-ads/api/reference/rpc/v25/KeywordPlanService>). Os métodos geradores migraram todos para `KeywordPlanIdeaService`, e `GenerateKeywordHistoricalMetrics` recebe a lista de keywords **diretamente no request** (§1.6) — não referencia plano nenhum. **Nenhum plano precisa ser criado.**

Quanto ao suporte a mutate no Scripts: `AdsApp.mutate(operation, optArgs)` aceita *"a `MutateOperation` as defined in the Google Ads API REST Interface"* (<https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp>), e o `MutateOperation` de v25 **inclui sim** as cinco operações de keyword plan: `keyword_plan_operation`, `keyword_plan_campaign_operation`, `keyword_plan_campaign_keyword_operation`, `keyword_plan_ad_group_operation`, `keyword_plan_ad_group_keyword_operation` (<https://developers.google.com/google-ads/api/reference/rpc/v25/MutateOperation>, 64 operações no total).

**Portanto, tecnicamente, um Script pode criar um Keyword Plan. E isso não serve para nada**, porque o passo seguinte — gerar as métricas — é um RPC do `KeywordPlanIdeaService`, que não é uma `MutateOperation` e não é um recurso GAQL. **Não há superfície no Scripts para invocá-lo.** Criar o plano leva a um beco sem saída.

### 2.5 `TargetingIdeaService` — confirmado descontinuado

O `TargetingIdeaService` pertencia à **AdWords API**, que foi integralmente desligada. Evidência primária direta: todas as URLs sob `developers.google.com/adwords/api/` — incluindo `/docs/guides/targeting-idea-service` e `/docs/sunset-faq` — hoje **redirecionam para o guia de onboarding da Google Ads API**, servindo a página "Is the Google Ads API the right product for me?" em vez do conteúdo original. Verificado por fetch direto em 2026-08-21.

O substituto é o **`KeywordPlanIdeaService`** da Google Ads API — <https://developers.google.com/google-ads/api/reference/rpc/v25/KeywordPlanIdeaService>. O guia oficial o descreve como o equivalente programático da ferramenta Keyword Planner da UI: <https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas>.

*(A data exata do sunset da AdWords API não foi recuperada de fonte primária nesta pesquisa — o post de anúncio não foi localizado no arquivo do blog. O fato do desligamento está confirmado pelo redirecionamento universal das URLs; **a data específica fica NÃO CONFIRMADA**.)*

### 2.6 Caminho alternativo dentro do ecossistema Scripts? — Existe um, e ele não resolve

**`AdsApp.report()`:** aceita o mesmo tipo de query GAQL que `search()` (<https://developers.google.com/google-ads/scripts/docs/features/reports>), então herda exatamente a mesma limitação de §2.3. A página inclusive alerta que `report()` é *mais* restrito em campos: *"This is not the default format that results are returned in by the Google Ads API, so in some cases some fields may not be available in this format."* Não ajuda.

**`UrlFetchApp` chamando a Google Ads API de fora:** tecnicamente possível. O Scripts expõe `UrlFetchApp` e a documentação oficial cobre autenticação Basic, OAuth 1.0, OAuth 2.0 e service accounts para APIs de terceiros (<https://developers.google.com/google-ads/scripts/docs/integrations/third-party-apis>). **Mas isto não é um atalho**, por duas razões:

1. **Não existe credencial ambiente.** A página de third-party APIs não menciona nenhum acesso implícito às credenciais OAuth da própria conta, e a página de autorização do Scripts (<https://developers.google.com/google-ads/scripts/docs/concepts/authorization>) descreve apenas que o script roda "on the user's behalf" após um prompt de autorização — **não expõe um token para você reutilizar** (não há equivalente ao `ScriptApp.getOAuthToken()` do Apps Script documentado para o Google Ads Scripts). Você teria que embutir um refresh token OAuth próprio no código do script.
2. **E aí você voltaria ao developer token.** Chamar `KeywordPlanIdeaService` por HTTP exige o header `developer-token` — e esse token é o mesmo que está travado em Explorer. **O caminho circula de volta ao bloqueio da Pergunta 1.**

**Não há bypass.** A restrição do Explorer é de autorização no servidor, não de superfície de cliente.

**Nota lateral importante e favorável:** Google Ads Scripts **não requer developer token** e opera num regime de cota completamente diferente — por tempo de execução (*"maximum of 30 minutes"*, <https://developers.google.com/google-ads/scripts/docs/limits>), não por operações/dia. Ou seja, **a decisão já travada no projeto de ingerir performance/search terms/geo/device via Scripts continua 100% válida e não é afetada por nada nesta pesquisa.** O que morre é apenas a esperança de estender o Scripts para keyword research.

Outros limites do Scripts relevantes ao desenho da ingestão (<https://developers.google.com/google-ads/scripts/docs/limits>): iteradores devolvem até 50.000 resultados por padrão (ajustável via `withLimit()`), `selector.withIds()` aceita no máximo 10.000 IDs, log truncado em 100KB, contas paralelas em manager scripts até 50.

*(A página de limites **não documenta** teto de chamadas `UrlFetchApp` nem tamanho máximo de resposta — lacuna registrada em §5.)*

### 2.7 Onde então roda a chamada de Keyword Planner?

Fora do Scripts, no backend do Creator Engine (Next.js/Node), com credenciais OAuth próprias + developer token com Basic Access + permissible use de keyword research. É um segundo canal de ingestão, arquiteturalmente separado do canal de Scripts. Volume: ~24 requisições/semana (§1.6) — trivial de agendar.

---

## Pergunta 3 — Estado da API oficial de Google Trends

### 3.1 Existe? **Sim, mas é inacessível na prática.**

| Atributo | Estado |
|---|---|
| **Nome exato** | Google Trends API |
| **Status** | **Alpha**, fechado, por aplicação |
| **Anunciada em** | **2025-07-24** (quinta-feira) |
| **Status em 2026-08-21** | **Ainda alpha, ainda aceitando aplicações** — sem mudança pública de status em ~13 meses |
| **Como pedir acesso** | Formulário em <https://developers.google.com/search/apis/trends> ("Apply for the alpha") |
| **Gratuita?** | **Não documentado publicamente** |
| **Quotas** | **Não documentadas publicamente** |
| **Documentação de endpoints** | **Gated** — 404 para quem não foi aceito |

Fontes: <https://developers.google.com/search/blog/2025/07/trends-api> e <https://developers.google.com/search/apis/trends>

O anúncio original, verbatim:

> "The API will be available only to a very limited number of testers. If you're interested in testing, apply to be an alpha tester."

> "We'll start opening access on a rolling basis to a limited number of developers over the coming weeks. If you're not in the first batch of developers, don't worry, we'll ramp up access in the coming months."

Publicado por Daniel Waisberg e Hadas Jacobi, Google Trends team.

**Verificação de que continua alpha em 2026-08-21:** a landing page atual diz *"Want to get early access and provide feedback as we develop the API? We're now accepting applications for alpha testers"* e mantém o critério de seleção: *"As we can't open the API for everyone yet, we're prioritizing developers that know what they want to do, that can start doing it soon, and that are willing to provide feedback."*

**Verificação de que não houve follow-up:** enumerei o índice do Google Search Central Blog. Entre `/search/blog/2025/07/trends-api` e o post mais recente (`/search/blog/2026/07/search-console-social-video-platforms`) **não existe nenhum outro post sobre Trends API** — 28 posts publicados no intervalo, nenhum anunciando beta ou GA. Fonte: <https://developers.google.com/search/blog>

**Verificação de que a documentação técnica é gated:** testei quatro caminhos plausíveis de documentação em 2026-08-21 — `/search/apis/trends/reference`, `/search/apis/trends/docs`, `/search/apis/trends/guides/quotas`, `/search/apis/trends/overview` — **todos retornam HTTP 404**. A própria Google publica uma página de troubleshooting confirmando que o 404 é o comportamento esperado para não-aceitos:

> "If you've been accepted into the Trends Alpha Program and you're getting a 404 error when you try to access the Google Trends API documentation, try the following: Double-check which account you're using to log in. Make sure you're using the exact same email address where you received the initial invitation email."

Fonte: <https://developers.google.com/search/apis/trends/help/cant-access-docs>

**Consequência:** gratuidade e quotas **não podem ser determinadas de fonte pública**. Só o operador, se aceito no alpha e logado com a conta convidada, conseguirá ver. Registrado como lacuna.

### 3.2 Que dados ela entrega

Do anúncio oficial (<https://developers.google.com/search/blog/2025/07/trends-api>) e da landing (<https://developers.google.com/search/apis/trends>):

| Dimensão | Fato verbatim |
|---|---|
| **Profundidade histórica** | "we decided to limit the data to a rolling window of **1800 days (~5 years)**" |
| **Recência** | "The data goes all the way up to **just 2 days ago**." |
| **Granularidade temporal** | "we'll provide **daily, weekly, monthly, and yearly** aggregations" |
| **Geo** | "The API will offer **region and subregion** breakdowns, as defined in the **ISO 3166-2** standard." |
| **Natureza do valor** | "the numbers don't reflect absolute numbers, they reflect **search interest**" |
| **Comparação de termos** | "The API makes it easier to compare **dozens of terms**, while the Trends UI only lets you make comparisons between eight terms." |

*(⚠️ **Inconsistência da própria Google:** o blog diz *"the Trends website offers only comparisons of **5** terms"*, a landing page diz *"the Trends UI only lets you make comparisons between **eight** terms"*. Irrelevante para o projeto, mas registra que as duas páginas oficiais se contradizem.)*

### 3.3 A normalização é intra-requisição? — **NÃO. Este é o achado mais importante da Pergunta 3.**

O projeto assumiu que o índice seria 0–100 normalizado dentro do conjunto de termos da requisição (como na UI). **A API foi desenhada explicitamente para não ser assim.** Verbatim:

> "On the Trends website, the results are scaled from 0 to 100 every time you request data. **The API uses a different method for scaling which is consistent across requests, and lets you join, compare, and merge data from multiple requests.** However, while the API returns consistently scaled data, the numbers don't reflect absolute numbers, they reflect search interest."

> "The advantage of this approach is that it enables developers to compare search interest between different requests. For example, if you monitor specific terms over time, with the API you can pull data only for the last period; in the Trends website you'd have to pull the entire period in every request, since each Trends website request scales the data between 0 to 100."

Fonte: <https://developers.google.com/search/blog/2025/07/trends-api>

E a landing reforça, de forma ainda mais explícita:

> "**Since API data is not scaled from 0 to 100**, you can pull search interest only for the last period when monitoring a term over time. In the Trends website, you'd have to pull the entire period in every request."

Fonte: <https://developers.google.com/search/apis/trends>

**Impacto no projeto — duplo, e nas duas direções:**

✅ **Bom:** elimina o pior problema operacional do Trends. Com normalização intra-requisição, adicionar um produto novo ao conjunto de termos re-escala tudo e invalida a série histórica salva no banco; e monitorar 150 termos exigiria montar grupos sobrepostos com termos-âncora e re-encadear escalas manualmente. Com escala consistente entre requisições, você pode **puxar apenas o delta do último período e fazer append no Postgres**, e comparar termos que nunca apareceram juntos numa mesma chamada. É exatamente o que um radar de oportunidade precisa.

⚠️ **Atenção:** o valor **não é um índice 0–100**. Se o schema do módulo de Afiliados modelar a coluna como `0-100`, está errado. A documentação **não diz qual é a escala real, nem o range, nem a unidade** — apenas que é "search interest" consistente. **Isto é ambíguo e não vou inventar uma leitura**: a forma concreta do valor só é determinável com acesso ao alpha.

**Contexto sobre o índice da UI**, para comparação (<https://support.google.com/trends/answer/4365533>):

> "Each data point is divided by the total searches of the geography and time range it represents to compare relative popularity."

> "The resulting numbers are then scaled on a range of 0 to 100 based on a topic's proportion to all searches on all topics."

> "Google Trends provides access to a largely unfiltered **sample** of actual search requests made to Google."

> "While only a sample of Google searches are used in Google Trends, this is sufficient because we handle billions of searches per day."

Note que **mesmo o Trends é amostra**, não censo — vale para calibrar expectativa de ruído em termos de cauda longa, que é onde um produto nutra novo começa.

### 3.4 Se não há acesso oficial: estado das alternativas não-oficiais

**`pytrends` — a biblioteca de referência — está morta.** O repositório `GeneralMills/pytrends` exibe o banner: **"This repository was archived by the owner on Apr 17, 2025. It is now read-only."** Verificado diretamente em 2026-08-21 em <https://github.com/GeneralMills/pytrends>.

O timing é notável: arquivada em abril de 2025, três meses antes de a Google anunciar a API oficial.

O próprio README já era explícito quanto ao status e ao rate limiting *(fonte secundária — é documentação da biblioteca, não da Google — mas é a fonte autoritativa sobre o comportamento da própria biblioteca)*:

> "This is not an official or supported API"

> "Rate Limit is not publicly known, let me know if you have a consistent estimate."

O README relata um caso de ~1.400 requisições sequenciais disparando o limite, com recomendação de 60 segundos entre requisições. **Isso é anedota de usuário reportada num README, não medição sistemática — NÃO CONFIRMADO como rate limit real.**

**Sobre bloqueio de IP e existência de forks mantidos: NÃO CONFIRMADO.** Não há fonte primária, e não localizei um sucessor oficialmente mantido dentro do escopo de fontes autorizadas desta pesquisa.

### 3.5 O que os Termos de Serviço do Google dizem — factualmente

**Google Terms of Service, em vigor desde 2026-07-30** (<https://policies.google.com/terms>), seção "Don't abuse our services". A cláusula diretamente aplicável, verbatim:

> "using automated means to access content from any of our services **in violation of the machine-readable instructions on our web pages** (for example, robots.txt files that disallow crawling, training, or other activities)"

E, separadamente:

> "You must not abuse, harm, interfere with, or disrupt our services or systems — for example, by: introducing malware, spamming, hacking, or **bypassing our systems or protective measures**"

> "reverse engineering our services or underlying technology, such as our machine learning models, to extract trade secrets or other proprietary information, except as allowed by applicable law"

**Ponto crítico: a cláusula de acesso automatizado é condicionada ao robots.txt.** Ela não proíbe acesso automatizado em geral — proíbe acesso automatizado *em violação das instruções machine-readable*. Então o robots.txt é load-bearing.

**`https://trends.google.com/robots.txt`, conteúdo integral, verificado em 2026-08-21:**

```
# trends.google.com/robots.txt

User-agent: *
Disallow: /explore?
Disallow: /trends/explore?
```

**Leitura precisa deste arquivo — e onde ela fica ambígua:**

- O que está **explicitamente proibido** é `/explore?` e `/trends/explore?` — as páginas HTML da UI do Trends com query string.
- Os endpoints internos que o `pytrends` e similares consomem ficam sob `/trends/api/...` (ex.: `/trends/api/explore`, `/trends/api/widgetdata/multiline`). Pela regra de casamento por prefixo do robots.txt, `/trends/api/explore?` **não** começa com `/trends/explore?` e portanto **não é literalmente coberto** por essas duas linhas.
- **Não vou concluir daí que scraping do endpoint interno é permitido.** Isso seria uma leitura de advogado sobre uma frase, e há pelo menos três razões independentes para não confiar nela: (a) a cláusula "bypassing our systems or protective measures" opera separadamente do robots.txt e o rate limiting do Trends é plausivelmente uma "protective measure"; (b) a intenção do robots.txt é evidentemente proibir a raspagem do Explore, e o endpoint interno é o mesmo dado; (c) os endpoints internos não são documentados nem estáveis, e a Google não deve nenhuma compatibilidade a quem os usa. **A questão é genuinamente ambígua no texto e é uma decisão de risco do operador, não uma leitura técnica que a documentação resolva.**

**Nota factual adicional:** o feed público `https://trends.google.com/trending/rss?geo=BR` responde **HTTP 200, `text/xml`** (verificado em 2026-08-21) e **não é bloqueado pelo robots.txt** acima. Porém ele entrega apenas **trending searches do momento** — não série histórica de termos arbitrários. É inútil para o caso de uso (monitorar 150 termos específicos ao longo do tempo) e **não é documentado em `developers.google.com`**, portanto não conta como API oficial. Registrado por completude.

---

## Pergunta bônus — Outras fontes gratuitas e oficiais

Apenas o que é **gratuito e oficial**:

### 4.1 Bing Webmaster Tools API — `GetKeywordStats` ⭐ a descoberta útil

Esta é a única fonte gratuita, oficial e **imediatamente acessível** de volume absoluto de busca com série temporal encontrada nesta pesquisa.

**Assinatura:** `GetKeywordStats(string q, string country, string language)` → `List<KeywordStats>`
Descrição oficial: **"Get keyword historical statistics"**
Fonte: <https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getkeywordstats?view=bing-webmaster-dotnet>

**Campos de `KeywordStats`:** `Query`, `Date`, `Impressions`, `BroadImpressions`
Fonte: <https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.keywordstats?view=bing-webmaster-dotnet>

**Método irmão:** `GetRelatedKeywords(string q, string country, string language, DateTime startDate, DateTime endDate)` → `List<Keyword>` com campos `Query`, `Impressions`, `BroadImpressions`. Descrição oficial: **"Get keyword impressions for selected period"**
Fonte: <https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getrelatedkeywords?view=bing-webmaster-dotnet>

**Por que isso importa muito:** os parâmetros são `(query, country, language)` — **arbitrários**. Não há parâmetro `siteUrl`. Ou seja, isto **não está restrito às queries que trazem tráfego ao seu site** — é pesquisa de mercado genuína. E devolve `Date` + `Impressions`, isto é, **série temporal de volume absoluto por geo**, que é exatamente o formato que o projeto precisa e que cobre *as duas metades do sinal ao mesmo tempo* (nível e derivada).

**Custo e obtenção da chave:** gratuito. Requer uma conta Bing Webmaster Tools e **pelo menos um site verificado** para gerar a API key:

> "Add and verify the site that you want to get information for through the APIs, if not already done."
> "Only one API key can be generated per user."
> "the API key is generated for a user and not a site and hence a user can use the same API key for all their verified sites"

Fonte: <https://learn.microsoft.com/en-us/bingwebmaster/getting-access> (last updated 2022-10-13)

Acesso também por OAuth 2.0. Protocolos: SOAP, POX (XML) e JSON, em `https://ssl.bing.com/webmaster/api.svc/` — <https://learn.microsoft.com/en-us/bingwebmaster/getting-started>

**Ressalvas honestas, todas materiais:**
- **É volume do Bing, não do Google.** Para dimensionar mercado em absoluto é uma proxy enviesada (share do Bing varia muito por geo e por vertical). Para **detectar a forma da curva** — subindo, estável, recuperando — a direcionalidade tende a valer, mas isso é inferência minha, **não um fato documentado**.
- **Exige um site verificado.** O operador precisa ter (ou criar) uma propriedade web verificável. Se ele já tem landing pages/pre-sells para as ofertas de afiliado, isso já está resolvido.
- **A documentação é antiga (2022) e não publica rate limits nem quotas.** Varri as páginas de getting-access e getting-started: nenhuma menção a throttling. **Lacuna documental.**
- As páginas de referência .NET trazem o aviso padrão *"Some information relates to prerelease product that may be substantially modified before it's released."*

### 4.2 Google Search Console API — Search Analytics

Oficial, gratuita, **mas só para propriedades que o operador possui e verificou**.

**Dimensões:** query, page, country, device, date, hour, searchAppearance.
**Métricas:** clicks, impressions, CTR, average position.
**Row limit:** *"Valid range is 1–25,000; Default is 1,000"*, com paginação via `startRow`.
**Caveat oficial:** *"The API is bounded by internal limitations of Search Console and does not guarantee to return all data rows but rather top ones."*
Fonte: <https://developers.google.com/webmaster-tools/v1/searchanalytics/query> (last updated 2026-08-11)

**Quotas (generosas):** Search Analytics — 1.200 QPM por site, 1.200 QPM por usuário, 30.000.000 QPD e 40.000 QPM por projeto. Fonte: <https://developers.google.com/webmaster-tools/limits>

**Retenção: 16 meses.** *(Não localizei essa afirmação numa página de documentação primária dedicada durante esta pesquisa — a página de Performance report menciona apenas o default de 3 meses da visualização. A retenção de 16 meses aparece em páginas de Ajuda do Analytics sobre a integração com Search Console. **Marcar como parcialmente confirmado** até localizar a página canônica.)*

**Limitação estrutural para este projeto:** GSC mede **o desempenho do site do operador**, não a demanda do mercado. É sinal de *demanda capturada*, não de *demanda existente*. Um produto nutra novo que está subindo mas para o qual ele ainda não tem página **é invisível no GSC**. Serve como sinal de confirmação/lagging para termos onde ele já tem presença — não como radar de descoberta.

### 4.3 Keyword Planner pela UI + export manual — o fallback sem aprovação

Se a aplicação para Basic Access demorar ou for negada, a UI do Keyword Planner continua acessível na conta do operador (billing já cadastrado), e permite upload de lista de keywords por CSV e download dos resultados:

> "Enter or paste a list of keywords into the search box, or upload a list of keywords from a CSV file"
> "Download forecast by selecting the download button."

Fonte: <https://support.google.com/google-ads/answer/7337243>

É **manual e não automatizável** — não vira ingestão agendada. Serve como ponte de curto prazo e, principalmente, como **instrumento de calibração**: é assim que o operador descobre empiricamente se a conta dele vê números exatos ou faixas (§1.5), o que informa se vale a pena perseguir o Basic Access.

### 4.4 Descartados explicitamente

- **Cloud-managed access levels** (<https://developers.google.com/google-ads/api/docs/concepts/no-developer-token>): permite omitir o developer token das chamadas, mas os pré-requisitos incluem **"Approved developer token"** e uma Google Cloud organization, e é descrito como **programa piloto com aplicação**. **Não contorna a restrição do Explorer** — pressupõe um token já aprovado. Beco sem saída para este caso.
- **Google Ads API MCP server / Developer Assistant** (mencionados no post de 2026-02-06): são ferramentas de desenvolvimento sobre a mesma API. Usam o mesmo token, herdam as mesmas restrições.
- **DataForSEO:** já descartado pelo projeto (depósito mínimo US$50).

---

## Tabela final — metade do sinal × melhor caminho gratuito

| | **Volume absoluto** (dimensiona escala/mercado) | **Índice relativo / aceleração** (dá timing) |
|---|---|---|
| **Melhor caminho gratuito hoje** | **Google Ads API — `KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics`**, chamado do backend do Creator Engine (não do Scripts). Exige subir para **Basic Access** *e* obter permissible use **"Researching keywords and recommendations"**. | **Nenhum caminho oficial acessível.** Google Trends API existe mas está em alpha fechado. O substituto oficial gratuito é **Bing Webmaster Tools API — `GetKeywordStats`**, que devolve `Impressions` por `Date` (série temporal absoluta), da qual se deriva aceleração. |
| **Segundo melhor** | **Bing `GetKeywordStats`** — imediato, sem fila de aprovação, mas volume do Bing. | **Aplicar ao alpha do Trends** e esperar. Ou derivar aceleração do próprio `monthly_search_volumes[]` do Keyword Planner (4 anos de série mensal). |
| **O que entrega** | `avg_monthly_searches` + `monthly_search_volumes[]` mensais, até **4 anos**, + `competition_index` 0–100 + faixas de lance P20/P80. Até 10.000 keywords/request, **1 request por geo** (a resposta não tem dimensão de geo). | Bing: impressões absolutas com `Date` por query/país/idioma. Trends API (se aceito): "search interest" com escala **consistente entre requisições** (não 0–100), diário/semanal/mensal/anual, 1800 dias, região+sub-região ISO 3166-2, até 2 dias atrás. |
| **Fragilidade principal** | **Duplo gate humano.** Explorer bloqueia o serviço; Basic exige aplicação (5 dias úteis nominais, mas a Google admitiu backlog em 2026-02). A permissible use é um segundo julgamento subjetivo, com linguagem que enquadra o uso como suporte à criação de campanhas. **Ambos gratuitos, ambos fora do seu controle.** | **Trends: acesso é loteria.** Alpha por aplicação há 13 meses, sem SLA, sem docs públicas de quota, sem garantia de aceitação. **Bing: motor errado.** Direcionalidade plausível mas não documentada; exige site verificado; rate limits não publicados. |
| **Fragilidade secundária** | Granularidade **mensal** — cega para movimento intra-mês, que é onde uma oferta nutra nova explode. `include_adult_keywords` default `false` pode ocultar termos do nicho. Incerteza não resolvida sobre faixas vs. números exatos. | `pytrends` **arquivado em 2025-04-17**; endpoint interno não documentado, sem estabilidade garantida, e o enquadramento de ToS é genuinamente ambíguo (§3.5). |
| **O que se perde vs. fornecedor pago** | Latência de dias/semanas até aprovação (pago: chave na hora). Sem SERP features, sem CPC por match type, sem clickstream. Granularidade travada em mensal — fornecedores pagos vendem volume semanal/diário e "trend score" proprietário. Sem dados de concorrente. | **A perda é grande e real.** Um fornecedor pago entrega índice de tendência normalizado + volume no mesmo registro, na mesma latência, sem fila de aprovação. Aqui você compõe duas fontes de motores diferentes, com escalas incomparáveis, e ainda perde o sinal diário para termos com pouco volume no Bing. |
| **Custo real** | **US$ 0** (o "custo" é tempo de aprovação e risco de negativa). | **US$ 0** (o custo é cobertura incompleta). |

**Composição recomendada do sinal híbrido, dado o que é acessível:**
- **Nível/escala** → Keyword Planner (após Basic Access), mensal, por geo, 1 request/geo.
- **Timing/aceleração** → derivada de segunda ordem sobre `monthly_search_volumes[]` (4 anos de série mensal já vêm na mesma chamada — **isto sozinho já dá um sinal de tendência decente e o projeto não estava contando com ele**), complementada por Bing `GetKeywordStats` para resolução mais fina.
- **Trends API** → aplicar ao alpha agora, tratar como upside, **não colocar no caminho crítico**.

---

## Lacunas — o que a documentação não responde

1. **Faixas vs. números exatos na API.** Nenhuma fonte primária do Google explica quando o Keyword Planner devolve `1K–10K` em vez de número, nem se a regra vale para a API. O schema tipa `avg_monthly_searches` como `int64` (número único), mas isso não exclui que o número seja o ponto médio de um bucket. **A crença de que depende do gasto da conta é NÃO CONFIRMADA — só existe em threads de comunidade.** ➜ **Só o operador, logado na conta dele, consegue resolver isto**, comparando UI e resposta da API na mesma conta e nas mesmas keywords.

2. **Profundidade real de `monthly_search_volumes[]`.** `HistoricalMetricsOptions` diz "past 4 years"; a descrição do campo em `KeywordPlanHistoricalMetrics` diz "past twelve months". **Contradição interna, não resolvida.** Resolver com uma chamada real pedindo `year_month_range` de 48 meses.

3. **Critérios de aprovação de Basic Access e da permissible use "Researching keywords and recommendations".** A documentação lista ações que ajudam (verificação de anunciante, contas sob o mesmo manager, número do projeto GCP, descrição clara do caso de uso — <https://ads-developers.googleblog.com/2026/02/an-update-on-google-ads-api-developer.html>) mas **não define critério objetivo**, e adverte: *"We will reject applications that are unclear."* Não há como estimar probabilidade de aprovação para um radar de oportunidade de afiliado.

4. **Gratuidade e quotas da Google Trends API.** Não publicadas. A documentação de endpoints retorna 404 para não-aceitos. **Indeterminável sem aceitação no alpha.**

5. **Forma concreta do valor "search interest" da Trends API.** A Google diz o que ele **não** é (não é 0–100, não é absoluto) e que é consistente entre requisições — mas **não diz qual é a escala, o range, nem a unidade**. Impossível modelar a coluna no Postgres antes de ver uma resposta real.

6. **Rate limits da Bing Webmaster API.** Documentação sem menção a throttling, e sem atualização desde 2022-10-13. Descobrível apenas empiricamente.

7. **Limites de `UrlFetchApp` no Google Ads Scripts.** A página de limites não documenta teto de chamadas nem tamanho máximo de resposta. Relevante para dimensionar o POST do Script para o endpoint do Creator Engine.

8. **Estado atual de bibliotecas não-oficiais de Trends pós-arquivamento do `pytrends`.** Fora do escopo de fontes primárias desta pesquisa. Rate limits observados e risco real de bloqueio de IP permanecem **NÃO CONFIRMADOS**.

9. **Data exata do sunset da AdWords API / `TargetingIdeaService`.** O desligamento está confirmado (todas as URLs `/adwords/api/` redirecionam), mas o post de anúncio com a data não foi localizado no arquivo do blog oficial.

10. **Se os `geo_target_constants` realmente agregam.** A documentação **não afirma explicitamente** que os até 10 geos são combinados num único número. Inferi isso do schema de resposta, que não tem dimensão de geo (`GenerateKeywordHistoricalMetricsResult` = `{text, close_variants, keyword_metrics}`). **A inferência é forte mas é inferência** — vale confirmar empiricamente antes de dimensionar o job, porque se estiver errada o número de requisições cai por 3.

---

## Ações concretas para o operador

**Só o operador, logado, consegue executar ou verificar estes itens:**

1. **Checar o nível atual do token** em <https://ads.google.com/aw/apicenter> — a pesquisa assume Explorer, mas isso é estado de conta que não posso ver.
2. **Aplicar para Basic Access pedindo explicitamente permissible use "Researching keywords and recommendations"** — não apenas "Reporting". Seguir as recomendações do post de 2026-02-06: contas filhas sob o manager do token, verificação de anunciante concluída, número do projeto GCP se houver OAuth verification anterior, e descrição do caso de uso em algumas frases ligando a pesquisa de keywords à gestão das campanhas que ele de fato roda.
3. **Enquanto espera: abrir o Keyword Planner na UI** com 5 termos de um produto e checar se vê número exato ou faixa. Isso resolve a lacuna 1 e determina se o caminho vale a pena.
4. **Aplicar ao alpha da Trends API** em <https://developers.google.com/search/apis/trends> — custo zero, upside alto, latência indeterminada. Não bloquear nada nisso.
5. **Verificar um site no Bing Webmaster Tools e gerar a API key** — é o único caminho que produz dado útil ainda esta semana, sem depender de aprovação de ninguém.
