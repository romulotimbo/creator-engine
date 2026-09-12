## ADDED Requirements

### Requirement: Observações da Campanha na ficha
A ficha em `/afiliados/campanhas/[id]` SHALL expor Observações da Campanha como entrada distinta de “Observações da bridge”. Abrir essa entrada SHALL usar o modal amplo de texto puro. A ficha SHALL persistir o texto via `PATCH /api/afiliados/campanhas/[id]` no campo `observacoes`. `bridgeObservacoes` SHALL permanecer no bloco LP da ficha.

#### Scenario: Abrir e gravar pela ficha
- **WHEN** o operador autenticado abre Observações da Campanha na ficha, escreve um plano e salva
- **THEN** o PATCH persiste `observacoes` e reabrir o modal mostra o mesmo texto

#### Scenario: Bridge não recebe o dump
- **WHEN** o operador grava Observações da Campanha
- **THEN** `bridgeObservacoes` não muda

#### Scenario: Campanha sem texto
- **WHEN** `observacoes` é nulo
- **THEN** a ficha ainda oferece abrir o editor, em estado vazio

## MODIFIED Requirements

### Requirement: Ficha operacional da Campanha
O sistema SHALL exibir uma ficha autenticada em `/afiliados/campanhas/[id]` com os dados da `Campanha`: `nomeCampanhaGoogleAds`, `geo`, `estrategia`, `papelConta`, `status`, `budgetDiarioDefinido`, `budgetTesteAlocado`, `contaTrafego` / `nomeContaAds`, `dataInicio` / `dataFim`, `linkPainelGoogleAds`, `moeda`, `linkBridge`, `tipoBridge`, `bridgeObservacoes`, `observacoes`, `motivoEncerramento`, e o produto pai (nome + link para o catálogo). A ficha SHALL exibir também os rollups próprios da campanha (`gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`, `cpaReal`, calculados a partir de vendas confirmadas) como somente leitura, distintos e ao lado dos valores reportados pelo Ads (`CampanhaSnapshot.receitaConfirmada`, rotulado como referência/auditoria). A ficha SHALL permitir editar os campos editáveis via `PATCH /api/afiliados/campanhas/[id]`.

#### Scenario: Abrir ficha existente
- **WHEN** o operador autenticado navega para `/afiliados/campanhas/{id}` de uma campanha persistida
- **THEN** a página mostra os campos da campanha (incluindo entrada para Observações da Campanha, distinta da bridge), o nome do produto pai, e os dois conjuntos de números (rollup por venda vs. referência do Ads)

#### Scenario: Campanha inexistente
- **WHEN** o id não corresponde a nenhuma `Campanha`
- **THEN** o sistema responde 404

#### Scenario: Editar budget, status e LP bridge na ficha
- **WHEN** o operador grava `budgetTesteAlocado = 400`, `status = PAUSADO` e `tipoBridge = VSL`
- **THEN** o sistema persiste via PATCH e reexibe os valores salvos

#### Scenario: Encerrar campanha com motivo estruturado
- **WHEN** o operador muda `status` para `ENCERRADO` e seleciona `motivoEncerramento`
- **THEN** o sistema persiste o motivo (Falha de Execução ou Falha de Mercado) junto com o novo status

#### Scenario: Não autenticado
- **WHEN** um visitante sem sessão acessa a ficha ou o PATCH
- **THEN** o sistema rejeita (redirect de auth ou 401)
