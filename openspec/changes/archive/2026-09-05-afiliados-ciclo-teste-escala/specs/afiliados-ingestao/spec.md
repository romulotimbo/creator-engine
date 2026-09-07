## ADDED Requirements

### Requirement: Envelope de ingestão genérico
O sistema SHALL expor um único endpoint de ingestão de dado externo (`POST /api/afiliados/ingestao` ou equivalente), recebendo `{fonte, tipo, periodo: {inicio, fim}, linhas[]}`, onde `tipo` é um de `CAMPANHA_DIARIO`, `SEGMENTO`, `SERIE_TERMO`. O sistema SHALL despachar o processamento por `tipo` internamente — nenhuma rota separada por grão.

#### Scenario: Envelope de campanha-diário
- **WHEN** o Ads Script envia `POST` com `tipo=CAMPANHA_DIARIO` e linhas de gasto/cliques/conversões por campanha e dia
- **THEN** o sistema faz upsert de `CampanhaSnapshot` por linha, usando a chave natural `(campanhaId, dataSnapshot)`

#### Scenario: Tipo desconhecido rejeitado
- **WHEN** o envelope chega com `tipo` fora de `CAMPANHA_DIARIO`/`SEGMENTO`/`SERIE_TERMO`
- **THEN** o sistema rejeita com 422, sem persistir nenhuma linha

### Requirement: Autenticação por token dedicado
O sistema SHALL autenticar o endpoint de ingestão por header estático comparado com `timingSafeEqual`, usando uma variável de ambiente própria (`AFILIADOS_INGEST_TOKEN`), distinta de `N8N_PUBLISH_TOKEN`.

#### Scenario: Token ausente ou incorreto
- **WHEN** a requisição não traz o header esperado ou o valor não bate
- **THEN** o sistema responde 401 sem processar o corpo

#### Scenario: Token não configurado
- **WHEN** `AFILIADOS_INGEST_TOKEN` não está definido no ambiente
- **THEN** o sistema responde 503

### Requirement: Idempotência por upsert, sem histórico de revisão
O sistema SHALL fazer upsert last-write-wins por chave natural de cada grão (`(campanhaId, dataSnapshot)` para `CAMPANHA_DIARIO`; `(campanhaId, dimensao, valor, data)` para `SEGMENTO`). Uma segunda chegada da mesma chave com valores diferentes SHALL sobrescrever a linha, atualizando `updatedAt`, sem manter histórico da revisão anterior.

#### Scenario: Revisão retroativa do Ads
- **WHEN** já existe `CampanhaSnapshot` para `(campanhaId, dataSnapshot)` e chega um novo envelope com `gasto` diferente para a mesma chave
- **THEN** o sistema atualiza a linha existente com o novo valor e `updatedAt`, sem criar segunda linha

### Requirement: Materialização de calendário
O envelope SHALL carregar, além de `periodo`, um escopo explícito das entidades que a fonte tentou cobrir nesta rodada (`campanhasCobertas: [{googleAdsCustomerId, nomeCampanhaGoogleAds}]`), independente de terem gerado linha em `linhas[]`. Para o grão `CAMPANHA_DIARIO`, o sistema SHALL criar um `CampanhaSnapshot` com valores zerados para cada `(campanha, dia)` dentro de `periodo` que esteja no escopo mas não tenha linha correspondente em `linhas[]`.

#### Scenario: Campanha sem gasto no período inteiro
- **WHEN** o envelope cobre `periodo` de 7 dias e lista uma campanha em `campanhasCobertas` que não aparece em nenhuma linha de `linhas[]`
- **THEN** o sistema cria 7 `CampanhaSnapshot` com `gasto = 0` (e demais métricas zeradas) para essa campanha, um por dia do período

#### Scenario: Campanha fora do escopo não é tocada
- **WHEN** uma campanha existente no banco não aparece nem em `linhas[]` nem em `campanhasCobertas` do envelope
- **THEN** o sistema não cria nem altera nenhum snapshot dela

### Requirement: Identidade por conta + nome, sem auto-criação
O sistema SHALL casar cada linha de `CAMPANHA_DIARIO`/`SEGMENTO` pela chave composta `(googleAdsCustomerId, nomeCampanhaGoogleAds)`. Quando não houver `Campanha` correspondente, o sistema SHALL gravar a linha bruta em uma bandeja de não-reconciliados (`CampanhaNaoReconciliada`), sem criar `Campanha` automaticamente.

#### Scenario: Nome de campanha não casa com nenhum registro
- **WHEN** o envelope traz uma linha cujo `(googleAdsCustomerId, nomeCampanhaGoogleAds)` não corresponde a nenhuma `Campanha` existente
- **THEN** o sistema grava a linha em `CampanhaNaoReconciliada` com os dados brutos e não cria `Campanha`

#### Scenario: Reconciliação manual
- **WHEN** o operador vincula manualmente uma linha de `CampanhaNaoReconciliada` a uma `Campanha` existente na UI
- **THEN** o sistema processa a linha como se tivesse casado originalmente e remove (ou marca resolvida) a entrada da bandeja

### Requirement: Registro de coleta por fonte
O sistema SHALL manter um registro (`RegistroColeta`), chaveado por `(fonte, tipo)`, com a última execução bem-sucedida e o período coberto naquela execução. O envelope SHALL aceitar um payload alternativo sem `linhas[]` — `{fonte, tipo, status: "FALHA", erro}` — para a fonte reportar que tentou coletar e falhou.

#### Scenario: Execução bem-sucedida atualiza o registro
- **WHEN** um envelope válido de `(fonte, tipo)` é processado sem erro
- **THEN** o sistema atualiza `RegistroColeta.ultimaExecucaoEm` e `ultimoPeriodoCoberto` para aquela `(fonte, tipo)`

#### Scenario: Falha reportada explicitamente
- **WHEN** a fonte envia `{fonte, tipo, status: "FALHA", erro: "timeout"}`
- **THEN** o sistema grava o relato de falha associado a `(fonte, tipo)` sem tentar processar `linhas[]` (ausente)
