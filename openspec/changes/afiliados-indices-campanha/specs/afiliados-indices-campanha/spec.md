## ADDED Requirements

### Requirement: Índices de campanha com identidade estável
O sistema SHALL persistir índices de uma `Campanha` com `tipo` em `PALAVRA_CHAVE` | `DISPOSITIVO` | `LOCAL` | `PUBLICO`. A chave natural SHALL ser `(campanhaId, tipo, chave, correspondencia)` — `correspondencia` só se aplica a palavra-chave (`EXATA` | `FRASE` | `AMPLA`); nos demais tipos é nula. Palavra-chave SHALL carregar `validadoVisualmente` e `negativado` (booleanos, default false) na identidade, não na linha temporal. Dispositivo `chave` SHALL ser um de `SMARTPHONE` | `TABLET` | `COMPUTADOR`. Local `chave` e público `chave` SHALL ser texto livre não vazio. O sistema SHALL rejeitar segundo índice com a mesma chave natural (422).

#### Scenario: Palavra-chave única por correspondência
- **WHEN** a campanha já tem palavra-chave `keto gummies` / `EXATA` e o operador cria outra `keto gummies` / `AMPLA`
- **THEN** as duas identidades persistem

#### Scenario: Palavra-chave duplicada rejeitada
- **WHEN** o operador tenta criar segunda `keto gummies` / `EXATA` na mesma campanha
- **THEN** o sistema rejeita com 422 e não cria índice

#### Scenario: Local e público por rótulo livre
- **WHEN** o operador cria local `Canadá` e público `masculino 45-54`
- **THEN** ambos persistem com `chave` igual ao texto informado

### Requirement: Linha temporal append-only e vigente
O sistema SHALL gravar cada alteração de status, lance ou métrica de um índice como **nova linha** (`capturadaEm`, `origem` `MANUAL`|`COLETA`, `status` `ATIVO`|`PAUSADO`|`EXCLUIDO`, `ajusteLancePct`, `cpc`, `cliques`, `impressoes`, `vendasConversao`, `custoConversao`, `roi` opcional). O sistema NÃO SHALL atualizar linha temporal existente. O vigente de um índice SHALL ser a linha de maior `capturadaEm` (empate: `createdAt` mais novo). Métricas na linha SHALL significar acumulado do índice desde o início da campanha (valores Ads), distintos do rollup por `VendaAfiliado`. Quando o POST de linha omitir métricas, o sistema SHALL copiar as da vigente anterior.

#### Scenario: Troca de lance cria segunda linha
- **WHEN** o índice vigente tem `ajusteLancePct = 10` e o operador grava `15`
- **THEN** o sistema insere linha nova com `15`; a linha com `10` permanece; o vigente passa a ser `15`

#### Scenario: Ajuste sem métricas preserva acumulado
- **WHEN** a vigente tem `cliques = 62` e o operador envia só `ajusteLancePct = 15`
- **THEN** a linha nova tem `ajusteLancePct = 15` e `cliques = 62`

#### Scenario: Coleta mais nova vira vigente
- **WHEN** existe linha `MANUAL` com `ajusteLancePct = 15` e chega linha `COLETA` posterior com `ajusteLancePct = 10`
- **THEN** o vigente é `10`; a linha `15` permanece queryable

### Requirement: Flags de palavra-chave não fabricam foto
`PATCH` em `validadoVisualmente` ou `negativado` SHALL persistir só na identidade. O sistema NÃO SHALL inserir linha temporal por essa edição.

#### Scenario: Validar visualmente
- **WHEN** o operador marca `validadoVisualmente = true` numa palavra-chave que já tem uma linha
- **THEN** a identidade atualiza e o número de linhas temporais não muda

### Requirement: Três dispositivos no nascimento da campanha
Ao criar uma `Campanha`, o sistema SHALL materializar na mesma transação três índices `DISPOSITIVO` (`SMARTPHONE`, `TABLET`, `COMPUTADOR`), cada um com uma linha inicial `origem=MANUAL`, `status=ATIVO`, `ajusteLancePct=0` e métricas nulas. O sistema NÃO SHALL permitir criar índice `DISPOSITIVO` com `chave` fora desse trio. Campanhas já existentes sem o trio SHALL receber o mesmo seed de forma idempotente (backfill).

#### Scenario: Campanha nova já tem o trio
- **WHEN** o operador cria uma campanha
- **THEN** a ficha dessa campanha lista exatamente os três dispositivos, todos vigentes com lance 0

#### Scenario: Dispositivo inventado rejeitado
- **WHEN** o operador tenta criar índice `DISPOSITIVO` com `chave = CONNECTED_TV`
- **THEN** o sistema rejeita com 422

### Requirement: Escrita autenticada no mesmo cano
O sistema SHALL expor criação de índice (palavra-chave, local, público), append de linha e leitura de vigentes sob a campanha, autenticado por sessão. `origem` default SHALL ser `MANUAL`; o contrato SHALL aceitar `COLETA` no body sem exigir o envelope de ingestão. Visitante sem sessão SHALL receber 401. O sistema NÃO SHALL escrever no Google Ads.

#### Scenario: Criar palavra-chave com primeira linha
- **WHEN** o operador autenticado envia palavra-chave `keto gummies` / `EXATA`, status `ATIVO`, lance `10`, cliques `0`
- **THEN** o sistema persiste identidade + uma linha `MANUAL` e devolve esse vigente

#### Scenario: Não autenticado
- **WHEN** um visitante sem sessão POST em índices da campanha
- **THEN** o sistema responde 401 e não persiste

### Requirement: Comparativo de vigentes no mesmo produto
O sistema SHALL expor, autenticado, as vigentes de todas as `Campanha` de um `ProdutoAfiliado`, alinhadas por `(tipo, chave, correspondencia)`, lado a lado. Cada coluna SHALL identificar a campanha pelas variáveis já persistidas (`geo`, `estrategia`, `tipoBridge`, conta, `status`) e pelos rollups de decisão (`roiReal`, `cpaReal`). Índice presente numa campanha e ausente noutra SHALL aparecer como vazio nessa coluna. O comparativo SHALL usar só vigentes — sem seletor de data histórica.

#### Scenario: Duas campanhas do mesmo produto
- **WHEN** o produto tem campanha A (US, TSL) com palavra-chave `keto` / `EXATA` e campanha B (CA, VSL) sem essa palavra-chave
- **THEN** o comparativo lista as duas colunas e a linha `keto` / `EXATA` mostra o vigente de A e vazio em B

#### Scenario: Produto de outro dono não mistura
- **WHEN** o operador abre o comparativo do produto P
- **THEN** só campanhas com `produtoId = P` aparecem
