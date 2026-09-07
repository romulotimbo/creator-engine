## ADDED Requirements

### Requirement: Entrada do módulo Afiliados no Radar
O item Afiliados da sidebar SHALL abrir `/afiliados/radar` (Radar e decisão de ofertas) com essa aba marcada como ativa. A aba Contas de tráfego continua em `/afiliados`.

#### Scenario: Clique na sidebar
- **WHEN** o usuário autenticado clica em Afiliados na sidebar
- **THEN** a aplicação navega para `/afiliados/radar` e a aba "Radar e decisão de ofertas" aparece selecionada

#### Scenario: Contas de tráfego pela aba
- **WHEN** o usuário está no Radar e clica na aba Contas de tráfego
- **THEN** a aplicação mostra a lista de ContaTrafego em `/afiliados`

## MODIFIED Requirements

### Requirement: Interface de Navegação por Abas no Módulo Afiliados
O sistema MUST oferecer navegação por abas na seção `/afiliados`, permitindo alternar facilmente entre `Radar de Ofertas`, `Contas de Tráfego` e `Catálogo de Produtos`. A entrada padrão do módulo (sidebar) MUST ser o Radar.

#### Scenario: Alternar para aba Radar de Ofertas
- **WHEN** o usuário acessa `/afiliados` e clica na aba `Radar de Ofertas`
- **THEN** o sistema exibe a tabela comparativa com filtros por status/rede, ordenação por score/EPC/CPC e o painel de alocação de capital para testes.

#### Scenario: Entrada pela sidebar no Radar
- **WHEN** o usuário abre o módulo Afiliados pela sidebar
- **THEN** a aba Radar está selecionada e a tabela de ofertas é a view inicial
