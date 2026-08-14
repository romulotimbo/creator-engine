## ADDED Requirements

### Requirement: Cadastro e Gestão de OfertaDecisao
O sistema MUST permitir o cadastro, edição e visualização de ofertas de afiliados em fase de análise de oportunidade, armazenando métricas de redes de afiliados, métricas do Google Ads e informações de compliance.

#### Scenario: Cadastro manual de nova oferta
- **WHEN** o usuário envia o formulário de cadastro de oferta informando nome, plataformas, comissão, EPC e métricas do Google Ads
- **THEN** o sistema salva o registro em `OfertaDecisao`, calcula o score inicial e define o status de completude dos dados.

#### Scenario: Atualização de métricas do Google Ads
- **WHEN** o usuário edita os campos de CPC Mínimo/Máximo, Volume de Buscas e Brand Bidding em uma oferta existente
- **THEN** o sistema atualiza a oferta, recalcula o score de priorização e marca a completude de dados como `COMPLETO` se as informações de leilão e rede estiverem preenchidas.

### Requirement: Importação em Lote via CSV com Upsert
O sistema MUST disponibilizar um endpoint e interface para upload de arquivos CSV de ofertas (compatível com a estrutura de `produtos.csv`), realizando a limpeza automática de caracteres de moeda (`$`), percentuais (`%`), split de plataformas e execução de Upsert por nome da oferta.

#### Scenario: Importação com sucesso de produtos.csv
- **WHEN** o usuário faz upload de um arquivo CSV contendo dados de ofertas (ex: LipoBliss, Gluco6, Nerve Fresh)
- **THEN** o sistema sanitiza os valores numericos e insere ou atualiza cada `OfertaDecisao` no banco de dados sem remover dados manuais de Google Ads previamente cadastrados.

#### Scenario: Tratamento de campos vazios ou parciais no CSV
- **WHEN** o CSV possui campos numéricos vazios ou nulos (ex: `trafficGrowth60` ou `refund_rate` em branco)
- **THEN** o sistema armazena o valor como `null` e classifica a oferta como `PARCIAL` ou `INCOMPLETO`, aplicando a penalidade correspondente no score.

### Requirement: Cálculo Automático de Score de Priorização
O sistema MUST calcular dinamicamente uma pontuação de 0 a 100 para cada oferta com base no EPC normalizado, baixa taxa de refund, tendência de tráfego (30d/60d/90d), valor de comissão e completude dos dados.

#### Scenario: Recálculo de score ao alterar dados
- **WHEN** os dados de uma oferta são alterados via formulário ou importação de CSV
- **THEN** o sistema executa o algoritmo de scoring e atualiza a coluna `scoreCalculado` do registro.

### Requirement: Fluxo de Migração Go para Conta de Tráfego
O sistema MUST permitir que uma oferta aprovada no Radar ("Go!") seja associada a uma `ContaTrafego`, criando automaticamente um registro de `ProdutoAfiliado` (com chave estrangeira `ofertaDecisaoId`), vinculando-o em `ContaTrafegoProduto`, alterando o status da oferta para `EM_EXECUCAO` e registrando o motivo em `DecisionLogOferta`.

#### Scenario: Aprovação e criação de campanha em conta de tráfego
- **WHEN** o usuário aciona a ação "Go! Criar Campanha", escolhe a conta de tráfego de destino e digita a justificativa
- **THEN** o sistema gera o `ProdutoAfiliado` vinculado, cria a entrada em `ContaTrafegoProduto`, atualiza a oferta para `EM_EXECUCAO` e cria o histórico no `DecisionLogOferta`.

### Requirement: Interface de Navegação por Abas no Módulo Afiliados
O sistema MUST oferecer navegação por abas na seção `/afiliados`, permitindo alternar facilmente entre `Radar de Ofertas`, `Contas de Tráfego` e `Catálogo de Produtos`.

#### Scenario: Alternar para aba Radar de Ofertas
- **WHEN** o usuário acessa `/afiliados` e clica na aba `Radar de Ofertas`
- **THEN** o sistema exibe a tabela comparativa com filtros por status/rede, ordenação por score/EPC/CPC e o painel de alocação de capital para testes.
