## ADDED Requirements

### Requirement: Observações do Produto no modal amplo
O catálogo SHALL editar `ProdutoAfiliado.observacoes` no mesmo modal amplo de texto puro usado para Observações da Campanha — não num textarea curto embutido no form do produto. O rótulo SHALL ser Observações do Produto. A persistência continua no create/update já autenticado do produto.

#### Scenario: Editar observações pelo catálogo
- **WHEN** o operador abre Observações do Produto no catálogo, escreve uma particularidade e salva
- **THEN** o sistema persiste em `ProdutoAfiliado.observacoes` e reabrir o modal mostra o mesmo texto

#### Scenario: Form do produto sem textarea curto
- **WHEN** o operador abre criar/editar produto no catálogo
- **THEN** o form não exibe o textarea de duas linhas de observações; a edição desse campo passa pelo modal amplo
