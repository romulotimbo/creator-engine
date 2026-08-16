## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Interface de Navegação por Abas no Módulo Afiliados
O sistema MUST oferecer navegação por abas na seção `/afiliados`, permitindo alternar facilmente entre `Contas de Tráfego`, `Radar de Ofertas` e `Catálogo de Produtos`, nessa ordem da esquerda para a direita. A entrada padrão do módulo (sidebar) MUST ser Contas de tráfego em `/afiliados`.

#### Scenario: Alternar para aba Radar de Ofertas
- **WHEN** o usuário acessa `/afiliados` e clica na aba `Radar de Ofertas`
- **THEN** o sistema exibe a tabela comparativa com filtros por status/rede, ordenação por score/EPC/CPC e o painel de alocação de capital para testes.

#### Scenario: Entrada pela sidebar nas Contas
- **WHEN** o usuário abre o módulo Afiliados pela sidebar
- **THEN** a aba Contas de tráfego está selecionada e a lista de contas é a view inicial
