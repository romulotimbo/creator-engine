## MODIFIED Requirements

### Requirement: Fluxo de Migração Go para Conta de Tráfego
O sistema MUST permitir que uma oferta aprovada no Radar ("Go!") seja associada a uma `ContaTrafego`, criando automaticamente um registro de `ProdutoAfiliado` (com chave estrangeira `ofertaDecisaoId`), vinculando-o em `ContaTrafegoProduto`, alterando o status da oferta para `EM_EXECUCAO` e registrando o motivo em `DecisionLogOferta`. `OfertaDecisao.statusDecisao = EM_EXECUCAO` SHALL ser terminal: nenhum fluxo SHALL mover a oferta de volta para `GARIMPO`/`ANALISE`/`APROVADO_TESTE` depois da conversão. `PAUSADO`/`DESCARTADO` SHALL permanecer válidos apenas antes da conversão (pré-`EM_EXECUCAO`).

#### Scenario: Aprovação e criação de campanha em conta de tráfego
- **WHEN** o usuário aciona a ação "Go! Criar Campanha", escolhe a conta de tráfego de destino e digita a justificativa
- **THEN** o sistema gera o `ProdutoAfiliado` vinculado, cria a entrada em `ContaTrafegoProduto`, atualiza a oferta para `EM_EXECUCAO` e cria o histórico no `DecisionLogOferta`

#### Scenario: Tentativa de reverter oferta convertida
- **WHEN** qualquer fluxo tenta mudar `statusDecisao` de uma `OfertaDecisao` já `EM_EXECUCAO` para `PAUSADO` ou `DESCARTADO`
- **THEN** o sistema rejeita — o diagnóstico keep/kill pós-conversão vive em `Campanha.status`/`motivoEncerramento`, não em `OfertaDecisao`

## ADDED Requirements

### Requirement: Priorização por curva de demanda de busca
O sistema SHALL gerar `ItemFila` de priorização de `OfertaDecisao` a partir da regra de curva ascendente (capability `afiliados-termo-demanda`), visível na tabela do Radar.

#### Scenario: Item de priorização visível no Radar
- **WHEN** a regra de curva ascendente gera um `ItemFila` para uma `OfertaDecisao` em `GARIMPO`/`ANALISE`
- **THEN** a tabela do Radar exibe um indicador de prioridade para aquela oferta
