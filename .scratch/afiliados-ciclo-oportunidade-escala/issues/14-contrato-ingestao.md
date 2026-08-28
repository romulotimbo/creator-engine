# 14 — Contrato de ingestão agnóstico de fonte

Type: grilling
Status: closed
Blocked by: 01, 02
Assignee: claude

## Question

Três fontes vão alimentar o mesmo domínio, com cadências e confiabilidades diferentes: Google Ads
Scripts (primário), CSV manual (fallback e backfill), e DataForSEO (demanda de busca). A API oficial
do Google Ads é upgrade futuro. O objetivo travado no charting: **trocar a fonte sem trocar o modelo
de domínio**.

Decidir o **envelope de ingestão**:

- **Forma do contrato**: um endpoint genérico que recebe `{fonte, tipo, período, linhas[]}` e despacha
  por tipo, ou endpoints separados por grão (campanha-diário, termo, segmento)? O repo já tem o
  padrão de import CSV por rota específica (`/api/afiliados/produtos/[id]/campanhas/import-csv`).
- **Idempotência**: `CampanhaSnapshot` já é `@@unique([campanhaId, dataSnapshot])` — upsert por
  chave natural. Estender o mesmo princípio aos grãos novos, e definir o que acontece quando a mesma
  data chega duas vezes com números diferentes (Ads revisa dados retroativamente).
- **Autenticação**: o repo usa token estático (`N8N_PUBLISH_TOKEN`). Vale o mesmo padrão para o
  endpoint que Ads Scripts vai chamar?
- **Casamento de identidade**: Ads Scripts manda nome de campanha, o banco tem `Campanha.id`. Já
  existe `normalizeCampaignName` no import CSV. O que acontece com linha que não casa — cria,
  rejeita, ou vai para uma bandeja de não-reconciliados?
- **Onde o agendamento mora**: dentro do Ads Script, no n8n, ou nos dois (Ads empurra, n8n puxa
  DataForSEO)? Não há cron na app.
- **Registro de coleta**: guardar quando cada fonte rodou pela última vez e se falhou — sem isso,
  dado velho parece dado atual e a fila decide sobre ficção.

## Notas herdadas dos tickets 01 e 02

- **Ausência de linha significa zero, não "não coletado".** Ads Scripts não retorna dias sem métrica
  (`includeZeroImpressions` é proibido em GAQL). O envelope precisa carregar o **intervalo coberto**
  pela coleta, não só as linhas — senão é impossível distinguir "gastou zero" de "a coleta falhou".
  Esta é provavelmente a decisão mais consequente deste ticket.
- **Reconciliação entre grãos é impossível por design**: a soma dos termos nunca bate com o total da
  campanha (omissão por limiar de privacidade). O contrato não deve tentar validar consistência
  entre grãos, e nenhum grão deve ser derivado de outro.
- **Normalizações obrigatórias na entrada**: micros → decimal; `geoTargetConstants/NNN` → país;
  `segments.device` com 7 valores possíveis.
- **As fontes têm relógios diferentes e isso não é configurável**: Ads Scripts pode ser horário ou
  diário (ambiguidade a confirmar na UI); volume absoluto DataForSEO é **mensal**, com gatilho
  `google_ads/status.actual_data`; Trends é diário/semanal. Um agendador único com uma cadência só
  não serve — o registro de coleta precisa ser por fonte.
- **Autenticação por header estático está validada** — `UrlFetchApp` aceita headers customizados
  arbitrários, então o padrão do repo (`N8N_PUBLISH_TOKEN`) serve sem adaptação.
- **Teto de payload é 50 MB por POST**, 20.000 chamadas/dia — folgado para este volume. Paginação só
  vira questão se o backfill histórico for feito pelo mesmo caminho.
- **MCC sequencial não tem teto de contas** (paralelo tem teto rígido de 50). Identidade da conta
  via `customer.id` no GAQL, que não segmenta métricas — incluir sempre no envelope.

## Formato real do export CSV do Keyword Planner (verificado em 22/08/2026)

Um export real da UI (`Keyword Forecasts 2026-08-22.csv`) revelou que o caminho de fallback manual
**não é CSV no sentido que o repo assume**:

- **Encoding UTF-16LE com BOM** (`FF FE`), não UTF-8.
- **Separador é TAB**, apesar da extensão `.csv`.
- **Locale segue o idioma de exibição da conta**, não um formato estável: decimal com vírgula
  (`8324,33`), datas por extenso em português (`1 de setembro de 2026`), rótulos traduzidos
  (`Total da campanha`). Duas contas com idiomas diferentes exportam formatos diferentes.

**Impacto direto:** `src/lib/afiliados/csv-parser.ts` detecta delimitador entre `;` e `,` e assume
texto UTF-8 — **falharia inteiro** neste arquivo. O mesmo vale para `campanha-csv.ts`. Se o import
manual sobreviver como fallback (e ele deve, porque é o único caminho enquanto a aprovação da API não
sai), o parser precisa detectar BOM UTF-16 e TAB, e normalizar decimal por locale.

Isso reforça a decisão de desenhar o envelope de ingestão como contrato próprio em vez de aceitar
"o CSV que o Google der": o formato do Google não é estável nem entre contas.

## Answer

**Endpoint único genérico**, não rotas por grão — despacha por `tipo` internamente. Justificativa:
o registro de coleta, o campo de intervalo coberto e a autenticação são propriedades do envelope,
não do grão; centralizá-los evita duplicar a mesma lógica em N rotas, e novo grão futuro (upgrade
pra API oficial) não exige nova rota nem nova auth. A rota de CSV humano existente
(`/produtos/[id]/campanhas/import-csv`) **não migra** para este contrato — é um ator diferente
(humano autenticado por sessão, escopado a um produto), fica como está.

**Escopo do `tipo` nesta rodada: `CAMPANHA_DIARIO`, `SEGMENTO`, `SERIE_TERMO`.** O grão (b) do
ticket 02 — search-term performance report (`search_term_view`, custo/cliques por termo
efetivamente pesquisado dentro de uma campanha) — **fica fora**: não existe entidade nem regra
fechada que o consuma (é diferente de `SerieTermo`/ticket 05, que é demanda por produto/oferta, não
performance por campanha). Registrado em "Not yet specified" — entra quando uma regra real pedir
(ex: mineração de keyword negativa).

**Idempotência: upsert last-write-wins, sem histórico de revisão.** Mesmo comportamento que
`campanhaSnapshot.upsert` já tem no CSV humano — não inventa um segundo comportamento pra mesma
tabela dependendo de quem escreveu. As regras que consomem isso operam em janelas agregadas (mês
calendário, 3 dias pré/pós-ajuste), não em snapshot diário isolado como fonte de verdade permanente,
então uma revisão retroativa do Ads não precisa ser rastreada como histórico. Único ajuste sobre o
que já existe: adicionar `updatedAt` em `CampanhaSnapshot` e no futuro `SegmentoCampanhaSnapshot`
(hoje só têm `createdAt`).

**Materialização do calendário (a decisão mais consequente) é responsabilidade do endpoint, não da
fonte.** O envelope carrega `periodo: {inicio, fim}` **e** um escopo explícito das entidades que a
fonte tentou cobrir nesta rodada (ex: `campanhasCobertas: [{googleAdsCustomerId, nomeCampanhaGoogleAds}]`),
independente de terem gerado linha em `linhas[]`. O endpoint cruza escopo × período × linhas
recebidas e cria os snapshots zero que faltam. Centralizar isso é o que sustenta "trocar a fonte sem
trocar o modelo": cada fonte nova só declara o que tentou cobrir, sem reimplementar lógica de
calendário em JavaScript (Ads Script), Python (backfill) etc.

**Casamento de identidade: chave composta `(googleAdsCustomerId, nomeCampanhaGoogleAds)`**, não nome
sozinho — nomes de campanha não são globalmente únicos entre contas Ads diferentes, e a nota herdada
do ticket 02 já exigia incluir `customer.id` sempre no envelope. Requer schema novo:
`ContaTrafego.googleAdsCustomerId String?` (campo não existe hoje). Linha que não casa **não
auto-cria** — vai para bandeja de não-reconciliados (`CampanhaNaoReconciliada`, dados brutos da
linha + timestamp), diferente do CSV humano que auto-cria porque roda dentro de um `produtoId`
conhecido. O endpoint genérico não tem `produtoId` no payload — Ads Scripts não tem esse conceito —,
então não há como inventar o produto de destino automaticamente. Reconciliação é manual, na UI.

**Autenticação: token novo e dedicado `AFILIADOS_INGEST_TOKEN`**, não reaproveita
`N8N_PUBLISH_TOKEN` (que já protege `/api/publicacao/*` para o ator n8n). Escopo do token é por
domínio/blast-radius, não por chamador — n8n vai guardar os dois tokens quando também chamar este
endpoint (ver agendamento). Mecanismo (`safeEqual`, header estático) generaliza a partir de
`src/lib/publicacao.ts:99-119`, sem reinventar.

**Agendamento é por fonte, sem orquestrador central:** Ads Scripts agenda nativamente dentro do
Google Ads (trigger do Apps Script) e **empurra** via POST, sem envolvimento do Creator Engine.
Séries de demanda (Bing `GetKeywordStats` hoje; Keyword Planner quando a aprovação Basic Access
sair, ver tickets 21/22) são **puxadas** por n8n em cron próprio (não há cron na app) e entram pelo
**mesmo endpoint genérico**, com `fonte` distinguindo `BING`/`GOOGLE_KEYWORD_PLANNER` e
`tipo=SERIE_TERMO`, autenticado com o mesmo `AFILIADOS_INGEST_TOKEN`.

**Registro de coleta:** entidade nova `RegistroColeta`, chave `(fonte, tipo)` — granularidade por
fonte *e* tipo porque relógios diferem até dentro da mesma fonte (Ads Scripts pode variar cadência
por grão). Cada POST bem-sucedido atualiza `ultimaExecucaoEm` + `ultimoPeriodoCoberto`. O envelope
aceita um payload alternativo sem `linhas[]` — `{fonte, tipo, status: "FALHA", erro}` — pra cobrir o
caso em que a fonte percebeu que quebrou antes de conseguir montar o POST normal. **Detecção de
silêncio** (fonte devia ter rodado e não rodou, dado velho parecendo atual) fica fora deste ticket —
é uma regra que consome `RegistroColeta`, candidata a viver na fila de decisão (ticket 18, já
fechado), não parte do contrato em si.

**Schema novo decidido aqui** (aplicar junto da redação da OpenSpec change, mesmo padrão dos tickets
05/11): `CampanhaSnapshot.updatedAt`, `SegmentoCampanhaSnapshot.updatedAt`,
`ContaTrafego.googleAdsCustomerId String?`, `CampanhaNaoReconciliada` (nova entidade),
`RegistroColeta` (nova entidade). Env var nova: `AFILIADOS_INGEST_TOKEN`.

Não desbloqueia nenhum ticket aberto (15, 17, 19, 20, 23 dependem de outras coisas).
