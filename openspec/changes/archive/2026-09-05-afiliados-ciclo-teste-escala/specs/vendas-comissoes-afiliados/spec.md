## MODIFIED Requirements

### Requirement: Gancho para automação futura
O sistema SHALL persistir campos `origem` (default `MANUAL`), `externalId` opcional, `campanhaId` opcional (`onDelete: SetNull`), um par `(tipoIdentificador, valorIdentificador)` substituindo a suposição de um campo `gclid` fixo, e `orderId` opcional em cada venda, para permitir ingestão futura via n8n/webhooks e atribuição de campanha sem mudança de modelo destrutiva. Esta change NÃO implementa os adapters de webhook por rede de afiliado (ClickBank, Digistore24, CartPanda, etc.) — só o contrato de campos que os receberia.

#### Scenario: Origem manual explícita
- **WHEN** venda é criada pela UI
- **THEN** `origem` é `MANUAL`, `externalId` pode permanecer nulo, e `campanhaId`/`tipoIdentificador`/`valorIdentificador`/`orderId` ficam nulos se não informados

#### Scenario: Sem adapter de webhook nesta change
- **WHEN** uma rede de afiliado tentaria postar uma venda via webhook
- **THEN** o sistema ainda não oferece um receptor por rede nesta versão (fora de escopo) — os campos existem para quando esse trabalho for feito

## ADDED Requirements

### Requirement: Atribuição de venda à campanha por subid
O sistema SHALL usar `Campanha.id` como o próprio valor do subid enviado às redes de afiliado — sem tabela de lookup separada. Quando o identificador recebido em `valorIdentificador` corresponder a uma `Campanha.id` existente, o sistema SHALL preencher `VendaAfiliado.campanhaId` automaticamente. O sistema NÃO SHALL inferir a campanha por produto+conta+janela de data — atribuição automática só ocorre por casamento direto do subid; qualquer outro caso fica sem campanha até atribuição manual.

#### Scenario: Subid casa com campanha existente
- **WHEN** uma venda chega com `valorIdentificador` igual ao `id` de uma `Campanha` existente
- **THEN** o sistema preenche `campanhaId` automaticamente com essa campanha

#### Scenario: Subid não casa com nenhuma campanha
- **WHEN** `valorIdentificador` não corresponde a nenhuma `Campanha.id`, ou a rede não devolveu identificador algum
- **THEN** a venda fica com `campanhaId = null` até que o operador atribua manualmente na tela de vendas

### Requirement: Rollup de ROI por campanha a partir de vendas confirmadas
O sistema SHALL calcular `Campanha.receitaConfirmadaAcumulada` como a soma de `VendaAfiliado.valorComissao` onde `status = APROVADA` e `campanhaId` = a campanha, recalculando a cada mudança relevante de uma venda associada. `CampanhaSnapshot.receitaConfirmada` (valor reportado pelo Google Ads) permanece inalterado e não SHALL alimentar mais o `roiReal`/`cpaReal` usados pelas regras de decisão — vira campo de auditoria/referência.

#### Scenario: Nova venda aprovada recalcula o rollup
- **WHEN** uma `VendaAfiliado` com `campanhaId` preenchido muda para `status = APROVADA`
- **THEN** o sistema recalcula `Campanha.receitaConfirmadaAcumulada` e `roiReal` daquela campanha, somando a comissão

#### Scenario: Estorno reduz o rollup sem reverter status operacional
- **WHEN** uma venda `APROVADA` já contabilizada muda para `ESTORNADA`
- **THEN** o sistema recalcula o rollup excluindo aquela venda da soma; `Campanha.status` não é alterado por esse recálculo, mesmo que a campanha esteja `ESCALANDO`

### Requirement: Status de upload de conversão offline
O sistema SHALL manter `VendaAfiliado.statusUploadAds` (`ENVIADA`|`FORA_DA_JANELA`|`EXCLUIDA_REDE_NATIVA`|`PENDENTE`), atualizado por cada tentativa de upload de conversão offline (ver capability `afiliados-conversao-offline`).

#### Scenario: Campo default
- **WHEN** uma `VendaAfiliado` é criada
- **THEN** `statusUploadAds` inicia como `PENDENTE`
