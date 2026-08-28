# 02 — Google Ads Scripts: o que dá para extrair e com que cadência

Type: research
Status: resolved
Blocked by: —

## Question

Ads Scripts foi escolhido como caminho primário de ingestão. Levantar contra a documentação oficial
do Google Ads Scripts o que ele consegue de fato entregar:

- Quais relatórios são alcançáveis: performance de campanha por dia, **search terms report**,
  **relatório de localização/geo dentro da campanha**, **relatório de dispositivo**. Confirmar que
  os três grãos que este mapa precisa (campanha-diário, termo, segmento geo×dispositivo) são
  extraíveis do mesmo script.
- Frequência máxima de agendamento (horária? diária?) e quota de tempo de execução por run.
- Limites de `UrlFetchApp` — tamanho de payload, número de chamadas por execução, timeout.
- Script em nível de **MCC** vs por conta: quantas contas um script cobre, e como o payload
  identifica de qual conta veio.
- Como autenticar o POST no endpoint do Creator Engine (o repo já usa o padrão de token estático:
  `N8N_PUBLISH_TOKEN`).
- O que **não** é extraível por Scripts e exigiria a API oficial — para saber o que fica de fora
  até o upgrade.

Saída: o teto real do que o envelope de ingestão pode carregar, insumo direto do ticket 14.

## Asset

Achados da pesquisa, com URL em cada afirmação: `../research/02-google-ads-scripts.md` (548 linhas,
11 lacunas documentais e checklist de 12 decisões derivadas).

## Answer

**Os três grãos cabem inteiramente em Ads Scripts. Nenhum exige a API oficial.** O motor de relatórios
do Ads Scripts *é* a Google Ads API — `AdsApp.report()` / `AdsApp.search()` aceitam GAQL arbitrário
contra o catálogo completo de campos. As diferenças Scripts↔API são todas de **orquestração**
(gatilho externo, duração, retry, logging truncado em 100 Kb), não de disponibilidade de dado.

Mapeamento dos grãos:

- **(a) campanha-diário** → `FROM campaign` + `segments.date`.
- **(b) termos** → `FROM search_term_view` (é o exemplo oficial da própria doc de Scripts).
- **(c) segmentos** → **existem dois recursos geo diferentes em v25**: `geographic_view` reporta por
  presença física *ou* área de interesse (campo `location_type`); `user_location_view` reporta só
  localização física e traz o booleano `targeting_location`. **O segundo é o acionável** para detectar
  vazamento de verba — é ele que diz se o clique veio de fora do alvo. Ambos são one-row-per-country
  por padrão, aceitam `campaign` como segmenting resource, e têm 11 segmentos `geo_target_*` para
  descer abaixo de país. **Dispositivo não tem view própria**: é `segments.device`, disponível nos
  quatro recursos.

Limites operacionais: timeout **30 min** (60 em MCC com `executeInParallel`); `UrlFetchApp` aceita
POST de **50 MB**, 20.000 calls/dia, timeout de rede 360 s configurável; headers customizados
arbitrários são suportados — **valida o padrão de token estático já usado no repo**. Em MCC, o modo
sequencial (`AdsManagerApp.select`) **não tem teto de contas**, enquanto `executeInParallel` tem teto
rígido de 50 (excedeu → exceção e *nenhuma* conta processada) — recomendado o sequencial. Identidade
da conta via `customer.id` no GAQL, que é *attributed resource* e portanto não segmenta métricas.

**Três achados que mudam o modelo de dados, não só a ingestão:**

1. **Dia sem métrica não retorna linha.** Com `segments.date`, "dates with no metrics are not
   returned" — vale para os três grãos, e `includeZeroImpressions` é proibido em GAQL. Ausência de
   linha **não** significa "sem dados coletados": significa zero. O sistema precisa materializar o
   calendário do lado dele. Sem isso, "gasto acumulado" e qualquer média por dia ficam errados, e a
   fila decide sobre buraco.
2. **Os grãos (a) e (b) nunca vão reconciliar, por design.** Termos abaixo do limiar de privacidade
   são **omitidos** do `search_term_view`, mas os cliques deles **contam** no total da campanha. Está
   textual na doc. Consequência: a soma dos termos sempre será menor que o total da campanha, e isso
   **não é bug de ingestão**. Qualquer tela que mostre as duas somas lado a lado precisa dizer isso,
   e nenhuma regra pode derivar total de campanha a partir de termos.
3. **`segments.device` tem 7 valores, não 3** — inclui `CONNECTED_TV`, `OTHER`, `UNKNOWN`,
   `UNSPECIFIED`. A regra "aumentar lance no Computador, reduzir Smartphone" (ticket 11) precisa
   decidir o que fazer com os outros quatro. Além disso: dinheiro em GAQL sempre vem em **micros**, e
   nomes geográficos vêm como resource names (`geoTargetConstants/1001773`), exigindo cache de
   `geo_target_constant` para virar "Canadá".

**Duas ambiguidades entre fontes primárias do próprio Google** (não resolvíveis por mais leitura):

- **Frequência de agendamento.** A Central de Ajuda lista apenas "once, daily, weekly, monthly";
  duas soluções oficiais em developers.google.com mandam agendar "Hourly". Confirmar na UI da conta.
  Se horária não existir, o "acompanhamento frequente de gastos" do ticket 10 tem teto diário.
- **Unidade de contabilização de cota em MCC** — duas fontes do Google se contradizem.

Ressalva metodológica registrada pela pesquisa: a doc de Scripts linka a tabela de limites do Apps
Script **sem qualificar quais linhas valem**, e essa tabela contém "Script runtime 6 min" que
comprovadamente não se aplica. Os números de `UrlFetchApp` são indicativos, não contratuais.

**Nuance sobre a premissa que travou esta decisão:** a doc atual de developer token diz que hoje se
concede **Explorer Access por padrão**, com acesso a contas de produção sob restrições — ou seja, "a
API oficial exige aprovação da Google" está **parcialmente desatualizado**. A escolha por Scripts
segue bem fundamentada pelos motivos operacionais (zero infra de auth, zero credencial de longa
duração no VPS), mas o registro fica aqui caso a decisão seja revisitada.
