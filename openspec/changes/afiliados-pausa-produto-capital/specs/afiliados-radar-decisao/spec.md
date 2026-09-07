## ADDED Requirements

### Requirement: Leitura de tráfego na oferta convertida
Para `OfertaDecisao` com `statusDecisao = EM_EXECUCAO` e produto vinculado, o Radar SHALL expor uma leitura derivada (não persistida, não é `statusDecisao`): gasto e budget do produto; se existe campanha `TESTANDO` ou `ESCALANDO` (`NO_AR`) ou não (`SEM_TRAFEGO`); `ProdutoAfiliado.status`. A linha SHALL manter o badge `EM_EXECUCAO`. A leitura SHALL oferecer atalho para o produto no catálogo e, quando houver campanha, para a ficha.

#### Scenario: Oferta convertida com produto pausado
- **WHEN** a oferta está `EM_EXECUCAO`, o produto está `PAUSADO` e não há campanha `TESTANDO`/`ESCALANDO`
- **THEN** o Radar mostra gasto real, `SEM_TRAFEGO`, produto pausado, e NÃO oferece alterar `statusDecisao` para `PAUSADO` ou `DESCARTADO`

#### Scenario: Oferta convertida com produto aberto sem tráfego
- **WHEN** a oferta está `EM_EXECUCAO`, o produto está `ATIVO` e todas as campanhas estão `PAUSADO` ou `ENCERRADO`
- **THEN** o Radar mostra gasto real, `SEM_TRAFEGO`, produto aberto (pode criar campanha no catálogo)

#### Scenario: Oferta convertida com campanha no ar
- **WHEN** a oferta está `EM_EXECUCAO` e existe campanha `TESTANDO` ou `ESCALANDO`
- **THEN** o Radar mostra `NO_AR` e o gasto/budget do produto

### Requirement: Modal de oferta convertida não oferece pausar nem descartar
O formulário de edição de uma `OfertaDecisao` já `EM_EXECUCAO` SHALL NOT permitir selecionar `PAUSADO`, `DESCARTADO`, nem qualquer status anterior à conversão. Campos de métrica da oferta permanecem editáveis.

#### Scenario: Editar oferta em execução
- **WHEN** o operador abre Editar numa oferta `EM_EXECUCAO`
- **THEN** o controle de `statusDecisao` está somente leitura (ou omitido) em `EM_EXECUCAO` e gravar outros campos não tenta mudar o status

## MODIFIED Requirements

### Requirement: Fluxo de Migração Go para Conta de Tráfego
O sistema MUST permitir que uma oferta aprovada no Radar ("Go!") seja associada a uma `ContaTrafego`, criando automaticamente um registro de `ProdutoAfiliado` (com chave estrangeira `ofertaDecisaoId`), vinculando-o em `ContaTrafegoProduto`, alterando o status da oferta para `EM_EXECUCAO` e registrando o motivo em `DecisionLogOferta`. `OfertaDecisao.statusDecisao = EM_EXECUCAO` SHALL ser terminal: nenhum fluxo SHALL mover a oferta de volta para `GARIMPO`/`ANALISE`/`APROVADO_TESTE` depois da conversão. `PAUSADO`/`DESCARTADO` SHALL permanecer válidos apenas antes da conversão (pré-`EM_EXECUCAO`). Keep/kill e pausa reversível pós-conversão vivem em `Campanha.status` e `ProdutoAfiliado.status`, nunca em `OfertaDecisao`.

#### Scenario: Aprovação e criação de campanha em conta de tráfego
- **WHEN** o usuário aciona a ação "Go! Criar Campanha", escolhe a conta de tráfego de destino e digita a justificativa
- **THEN** o sistema gera o `ProdutoAfiliado` vinculado, cria a entrada em `ContaTrafegoProduto`, atualiza a oferta para `EM_EXECUCAO` e cria o histórico no `DecisionLogOferta`

#### Scenario: Tentativa de reverter oferta convertida
- **WHEN** qualquer fluxo tenta mudar `statusDecisao` de uma `OfertaDecisao` já `EM_EXECUCAO` para `PAUSADO` ou `DESCARTADO`
- **THEN** o sistema rejeita — o diagnóstico keep/kill pós-conversão vive em `Campanha.status`/`motivoEncerramento`, e a pausa reversível do teste vive em `ProdutoAfiliado.status` / `Campanha.status`
