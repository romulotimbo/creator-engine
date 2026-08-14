## ADDED Requirements

### Requirement: Registro manual de venda/comissão
O sistema SHALL permitir criar, editar e excluir registros de venda/comissão afiliada vinculados a uma ContaTrafego, com data, valor da venda, valor da comissão, plataforma afiliada, status (`PENDENTE`, `APROVADA`, `CANCELADA`, `ESTORNADA`), produto opcional, observações e origem default `MANUAL`.

#### Scenario: Lançar comissão manual
- **WHEN** usuário preenche o formulário de venda no hub da ContaTrafego e salva
- **THEN** o sistema persiste `VendaAfiliado` com `origem=MANUAL` e `contaTrafegoId` da conta atual

#### Scenario: Venda com produto
- **WHEN** usuário associa um produto ao lançamento
- **THEN** o sistema persiste `produtoId` e aceita apenas produtos vinculados àquela ContaTrafego (ou produtos do catálogo com vínculo ativo — default: vinculados à conta)

#### Scenario: Editar status da comissão
- **WHEN** usuário altera status de PENDENTE para APROVADA
- **THEN** o sistema persiste o novo status sem exigir integração externa

#### Scenario: Excluir lançamento
- **WHEN** usuário exclui um registro de venda
- **THEN** o sistema remove o registro e atualiza totais do hub

### Requirement: Resumo de vendas no hub
O sistema SHALL exibir no hub da ContaTrafego totais agregados de comissão (e opcionalmente de vendas) para um período recente (ex.: 30 dias) e/ou total geral, filtráveis por status quando aplicável.

#### Scenario: Totais com dados
- **WHEN** existem vendas APROVADAS na ContaTrafego
- **THEN** o overview mostra soma de comissões aprovadas no período

#### Scenario: Sem vendas
- **WHEN** não há lançamentos na ContaTrafego
- **THEN** o overview/seção Vendas exibe estado vazio com CTA para lançar

### Requirement: Gancho para automação futura
O sistema SHALL persistir campos `origem` (default `MANUAL`) e `externalId` opcional em cada venda, para permitir ingestão futura via n8n/webhooks sem mudança de modelo destrutiva; esta change NÃO implementa webhooks nem sincronização automática.

#### Scenario: Origem manual explícita
- **WHEN** venda é criada pela UI
- **THEN** `origem` é `MANUAL` e `externalId` pode permanecer nulo

#### Scenario: Sem endpoint de webhook nesta change
- **WHEN** cliente chama uma rota de ingestão externa de comissões (se não existir)
- **THEN** o sistema não oferece webhook Braip/n8n nesta versão (fora de escopo)

### Requirement: Isolamento por ContaTrafego
O sistema SHALL listar e agregar vendas apenas no escopo da ContaTrafego selecionada; listagens de uma conta NÃO incluem vendas de outra.

#### Scenario: Isolamento de listagem
- **WHEN** usuário abre a seção Vendas da ContaTrafego A
- **THEN** o sistema NÃO exibe vendas da ContaTrafego B
