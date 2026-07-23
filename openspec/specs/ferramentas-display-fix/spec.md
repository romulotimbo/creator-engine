# ferramentas-display-fix Specification

## Purpose
Garantir que `/ferramentas` exiba corretamente custos mensais (Decimal → number) e continue utilizável mesmo se a query de credenciais globais falhar por migration pendente.
## Requirements
### Requirement: Exibição de custo mensal após cadastro de ferramenta
O sistema SHALL exibir o `custoMensal` na tabela de `/ferramentas` e no card de dashboard imediatamente após criar ou editar uma ferramenta com valor monetário informado.

#### Scenario: Criar ferramenta com custo
- **WHEN** usuário cadastra ferramenta com `custoMensal` positivo e salva
- **THEN** a tabela exibe o valor formatado em BRL na coluna Custo/mês após refresh da página

#### Scenario: Serialização Decimal na API
- **WHEN** cliente solicita `GET /api/ferramentas` autenticado
- **THEN** cada item retorna `custoMensal` como número JSON ou `null`, nunca objeto Decimal bruto

### Requirement: Page Ferramentas resiliente a falha de credenciais
O sistema SHALL renderizar a seção de ferramentas (dashboard + tabela) mesmo se a query de credenciais globais falhar (ex.: migration pendente).

#### Scenario: Migration pendente
- **WHEN** coluna `ferramentaId` ou `servico` ausente no banco
- **THEN** a página exibe ferramentas normalmente e banner orientando `db push`, sem erro 500 na página inteira
