# afiliados-radar-decisao Specification

## Purpose
Especificação do Radar de Ofertas de Afiliados e Fluxo de Decisão/Migração para Campanhas em Contas de Tráfego.
## Requirements
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
O sistema MUST oferecer navegação por abas na seção `/afiliados`, permitindo alternar facilmente entre `Contas de Tráfego`, `Radar de Ofertas` e `Catálogo de Produtos`, nessa ordem da esquerda para a direita. A entrada padrão do módulo (sidebar) MUST ser Contas de tráfego em `/afiliados`.

#### Scenario: Alternar para aba Radar de Ofertas
- **WHEN** o usuário acessa `/afiliados` e clica na aba `Radar de Ofertas`
- **THEN** o sistema exibe a tabela comparativa com filtros por status/rede, ordenação por score/EPC/CPC e o painel de alocação de capital para testes.

#### Scenario: Entrada pela sidebar nas Contas
- **WHEN** o usuário abre o módulo Afiliados pela sidebar
- **THEN** a aba Contas de tráfego está selecionada e a lista de contas é a view inicial

### Requirement: Score and scoreBreakdown are always computed, never directly editable
`OfertaDecisao.scoreCalculado` e `scoreBreakdown` SHALL ser sempre recalculados no servidor a cada update relevante do `OfertaDecisao` (qualquer campo que influencie o score: `epcRede`, `refundPct`, `tendenciaTrafego30d`, `comissaoValor`, `cpcMedioEsperado`, `volumeBuscaMensal`, `completudeDados`). Esses campos NUNCA são editáveis diretamente via API.

#### Scenario: Score recalculated on relevant field update
- **WHEN** o operador atualiza `epcRede` de uma oferta via formulário
- **THEN** o servidor recalcula `scoreCalculado` e `scoreBreakdown` antes de persistir, sem que o operador informe o score

#### Scenario: Score not recalculated on irrelevant field update
- **WHEN** o operador atualiza apenas `observacoes` de uma oferta
- **THEN** o score NÃO precisa ser recalculado — mas pode ser, por simplicidade, sem dano

#### Scenario: Direct score edit rejected
- **WHEN** uma request inclui `scoreCalculado: 99` no body
- **THEN** o campo é ignorado (stripped) antes de persistir — o valor calculado prevalece

### Requirement: Score clamped to [0, 100]
O `scoreCalculado` final SHALL sempre estar no intervalo [0, 100], mesmo que a soma bruta (`rawTotal`) seja negativa ou superior a 100.

#### Scenario: Negative raw score clamped to 0
- **WHEN** a soma bruta dos fatores resulta em -15 (ex: oferta com todos os indicadores ruins e dados incompletos)
- **THEN** `scoreCalculado = 0` (não -15)

#### Scenario: Raw score above 100 clamped to 100
- **WHEN** a soma bruta resulta em 105
- **THEN** `scoreCalculado = 100` (não 105)

### Requirement: Percentage fields use 0–100 scale
Todos os campos de porcentagem em `OfertaDecisao` SHALL usar escala 0–100 (não 0–1): `refundPct`, `tendenciaTrafego30d`, `tendenciaTrafego60d`, `tendenciaTrafego90d`, `bounceRate`, e quaisquer campos de `ctr`, `cvr`, `realRoi` futuros.

#### Scenario: refundPct stored as 0-100
- **WHEN** o operador informa `refundPct = 8.85` (representando 8,85%)
- **THEN** o valor `8.85` é persistido diretamente — sem multiplicação por 100 ou divisão por 100

#### Scenario: Score calculation uses 0-100 scale internally
- **WHEN** `refundPct = 8.85` e o score é calculado
- **THEN** a fórmula usa `(100 - 8.85) / 100 * peso` para normalizar o refund — não `(1 - 8.85) * peso`

### Requirement: Aba Contas de tráfego à esquerda e entrada do módulo
O `AfiliadosMainNav` SHALL listar as abas nesta ordem: Contas de tráfego (`/afiliados`), Radar (`/afiliados/radar`), Catálogo de Produtos (`/afiliados/produtos`). O item Afiliados da sidebar SHALL abrir `/afiliados` com a aba Contas de tráfego selecionada. Rotas existentes não mudam; não há redirect de `/afiliados` para o Radar.

#### Scenario: Ordem visual das abas
- **WHEN** o operador está em qualquer tela do módulo com `AfiliadosMainNav`
- **THEN** o primeiro botão à esquerda é Contas de tráfego, depois Radar, depois Catálogo

#### Scenario: Clique na sidebar
- **WHEN** o usuário autenticado clica em Afiliados na sidebar
- **THEN** a aplicação navega para `/afiliados` (lista de ContaTrafego) e a aba Contas de tráfego aparece selecionada

#### Scenario: Radar continua acessível pela aba
- **WHEN** o operador clica na aba Radar
- **THEN** a aplicação mostra `/afiliados/radar` sem alterar a URL de Contas

