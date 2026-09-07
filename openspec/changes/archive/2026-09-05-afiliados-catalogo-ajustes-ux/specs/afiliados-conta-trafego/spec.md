## MODIFIED Requirements

### Requirement: Entrada na navegação
O sistema SHALL expor o módulo Afiliados na sidebar (ou navegação principal equivalente) apontando para `/afiliados/radar`, sem alterar o fluxo existente de Personas. A lista de ContaTrafego permanece em `/afiliados`, acessível pela aba Contas de tráfego.

#### Scenario: Navegação sidebar
- **WHEN** usuário autenticado visualiza a sidebar
- **THEN** existe item Afiliados que leva ao Radar em `/afiliados/radar`

#### Scenario: Lista de contas pela aba
- **WHEN** usuário autenticado acessa `/afiliados` (aba Contas de tráfego)
- **THEN** o sistema exibe a lista de ContaTrafego com nome, slug, plataforma e status
