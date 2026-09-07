## ADDED Requirements

### Requirement: Quatro listas vigentes na ficha
A ficha em `/afiliados/campanhas/[id]` SHALL exibir as vigentes de palavra-chave, dispositivo, local e público daquela campanha: status, CPC, cliques, impressões, vendas/conversões (U$), custo de conversão (U$), ajuste de lance (%). Palavra-chave SHALL incluir texto, correspondência, `validadoVisualmente` e `negativado`. Local e público SHALL incluir ROI da vigente. Os três dispositivos SHALL aparecer mesmo com métricas nulas. A ficha SHALL deixar explícito que lance e status são registro no Creator Engine (não escrevem no Google Ads) e que as métricas do índice são acumulado Ads, distintos do rollup por venda.

#### Scenario: Ficha com palavra-chave e trio de dispositivos
- **WHEN** a campanha tem uma palavra-chave vigente e os três dispositivos
- **THEN** a ficha lista a palavra-chave e as três linhas de dispositivo com o lance vigente de cada

#### Scenario: Sem locais nem públicos
- **WHEN** a campanha não tem índices `LOCAL` nem `PUBLICO`
- **THEN** a ficha mostra estado vazio nesses blocos e ainda lista os dispositivos

### Requirement: Escrita manual de índice na ficha
A ficha SHALL permitir criar palavra-chave, local e público, editar flags da palavra-chave, e registrar nova linha (status, lance %, métricas opcionais) em qualquer índice existente. Cada gravação de linha SHALL ser append. A UI NÃO SHALL oferecer criar dispositivo extra.

#### Scenario: Operador sobe lance do desktop
- **WHEN** o operador grava `ajusteLancePct = 15` no dispositivo `COMPUTADOR`
- **THEN** a ficha reexibe vigente 15% nesse dispositivo

#### Scenario: Operador adiciona público
- **WHEN** o operador cria público com rótulo `masculino 45-54` e lance `10`
- **THEN** a ficha passa a listar esse público como vigente
