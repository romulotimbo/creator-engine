## ADDED Requirements

### Requirement: Upload de venda confirmada como conversão offline
O sistema SHALL disponibilizar um endpoint de leitura que gera, sob demanda, um CSV pronto para `AdsApp.bulkUploads().newCsvUpload().forOfflineConversions()`, contendo apenas `VendaAfiliado` com `status = APROVADA`. Checkout NÃO SHALL ser incluído nesse upload — é conversão nativa e tempo-real do lado do Ads.

#### Scenario: Venda aprovada elegível
- **WHEN** uma `VendaAfiliado` com `status = APROVADA`, `campanhaId` atribuído e identificador de clique presente ainda não foi enviada
- **THEN** ela aparece no CSV gerado pelo endpoint de leitura, com as colunas exigidas pelo Ads (`Google Click ID`/`order_id`, `Conversion Name`, `Conversion Time`, mais a linha `Parameters:TimeZone=`)

### Requirement: Exclusão por rede com integração nativa
O sistema SHALL permitir marcar, por configuração declarativa (não detecção automática), redes de afiliado cuja integração nativa com o Google Ads já cobre a conversão — vendas dessas redes SHALL ser excluídas do CSV de upload offline.

#### Scenario: Rede com integração nativa
- **WHEN** uma `VendaAfiliado` vem de uma rede marcada como integração nativa (ex.: ClickBank)
- **THEN** ela não aparece no CSV de upload offline, mesmo estando `APROVADA`

### Requirement: Status de envio nunca silencioso
`VendaAfiliado.statusUploadAds` SHALL registrar o resultado de cada tentativa de upload: `ENVIADA`, `FORA_DA_JANELA` (mais de 90 dias desde o clique), `EXCLUIDA_REDE_NATIVA`, `PENDENTE`. Uma venda que não sobe por estar fora da janela de 90 dias NÃO SHALL ficar sem registro do motivo.

#### Scenario: Venda fora da janela de 90 dias
- **WHEN** uma venda `APROVADA` é confirmada mais de 90 dias após o último clique registrado
- **THEN** o sistema marca `statusUploadAds = FORA_DA_JANELA`, sem tentar o upload

### Requirement: Retratação por reembolso
Quando uma `VendaAfiliado` previamente enviada muda para `ESTORNADA`, o sistema SHALL enviar uma retratação (`RETRACTION`) ao Ads, usando `orderId` quando presente; quando `orderId` for nulo, o sistema SHALL usar o par `(tipoIdentificador, valorIdentificador)` mais o timestamp da conversão original.

#### Scenario: Retratação com order id
- **WHEN** uma venda enviada com `orderId` preenchido é estornada
- **THEN** a retratação usa `orderId` como identificador

#### Scenario: Retratação sem order id
- **WHEN** a venda estornada não tem `orderId` (rede que não expõe, ex.: CartPanda)
- **THEN** a retratação usa `(tipoIdentificador, valorIdentificador)` + timestamp da conversão original

### Requirement: Toggle por fase da campanha
O sistema SHALL controlar se o upload de conversão offline está ativo via `LimiarGlobal` (com override por produto), desligado por padrão para campanhas `TESTANDO` e ligado por padrão para `ESCALANDO`.

#### Scenario: Campanha em TESTANDO
- **WHEN** a `Campanha` de uma venda `APROVADA` está em `status = TESTANDO` e o toggle não tem override para o produto
- **THEN** o sistema não inclui a venda no CSV de upload, mesmo sendo elegível
