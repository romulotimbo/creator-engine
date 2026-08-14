## ADDED Requirements

### Requirement: Entidade OrcamentoPeriodo
O sistema SHALL persistir `OrcamentoPeriodo` com: `id`, `periodo` (String `YYYY-MM`, unique, required), `capitalTotalDisponivel` (Decimal, required, ≥ 0), `moedaBase` (String, default `"USD"`), `limitePctPorProduto` (Decimal 0–100, nullable), `reservaMinimaPct` (Decimal 0–100, default 0), `createdAt`, `updatedAt`. Esta tabela é a fonte de verdade do capital disponível do período — não os campos individuais de oferta.

#### Scenario: Criar orçamento do mês corrente
- **WHEN** o operador informa `capitalTotalDisponivel = 5000`, `moedaBase = "USD"`, `periodo = "2026-08"`
- **THEN** o sistema persiste (upsert por `periodo`) e o widget deixa de exibir capital `$0,00`

#### Scenario: Periodo duplicado faz upsert
- **WHEN** já existe linha `2026-08` com capital 5000 e o operador salva capital 7000 para `2026-08`
- **THEN** a linha existente é atualizada; não há segunda linha do mesmo período

#### Scenario: Periodo inválido
- **WHEN** o operador envia `periodo = "agosto"` ou `"2026-13"`
- **THEN** o sistema rejeita com erro de validação Zod

### Requirement: Período corrente e rollover mensal
`getActiveCapitalAllocation()` e a tela de configuração SHALL usar o período civil corrente no fuso `America/Sao_Paulo` (`YYYY-MM`). Se não existir linha do mês corrente, o sistema SHALL copiar `capitalTotalDisponivel`, `moedaBase`, `limitePctPorProduto` e `reservaMinimaPct` do período imediatamente anterior (se houver), **sem copiar gasto**. Se não houver período anterior nem `PortfolioConfig`, capital efetivo é 0.

#### Scenario: Primeiro dia do mês sem linha nova
- **WHEN** hoje é 2026-09-01, existe `OrcamentoPeriodo` `2026-08` com capital 5000 e não existe `2026-09`
- **THEN** a leitura do widget materializa (ou trata como) `2026-09` com capital 5000 e os mesmos guardrails

#### Scenario: Nenhum período e PortfolioConfig com capital
- **WHEN** não há `OrcamentoPeriodo` e `PortfolioConfig.totalAvailableCapital = 3000`
- **THEN** o sistema cria `OrcamentoPeriodo` do mês corrente com esse capital e `moedaBase` de `PortfolioConfig.currency`

#### Scenario: Nada configurado
- **WHEN** não há `OrcamentoPeriodo` nem `PortfolioConfig`
- **THEN** `totalAvailableCapital = 0` (sem erro)

### Requirement: Tela de configuração de orçamento
O sistema SHALL oferecer UI (modal ou página no módulo Afiliados) para o operador definir capital total, moeda base, período, teto % por produto e reserva mínima do período corrente.

#### Scenario: Abrir configuração a partir do widget
- **WHEN** o operador aciona “Configurar” no painel de alocação de capital
- **THEN** o formulário exibe os valores do período corrente e permite salvar

#### Scenario: Moeda base normaliza o rótulo do widget
- **WHEN** `moedaBase = "USD"`
- **THEN** o widget formata capital, alocado, gasto e livre nessa moeda

### Requirement: Guardrail limite percentual por produto
Quando `limitePctPorProduto` está definido, o sistema MUST rejeitar persistir `ProdutoAfiliado.budgetTesteAlocado` se o valor for maior que `capitalTotalDisponivel * (limitePctPorProduto / 100)` do período corrente.

#### Scenario: Budget acima do teto percentual
- **WHEN** capital do período é 10000, `limitePctPorProduto = 30` e o operador tenta `budgetTesteAlocado = 4000` em um produto
- **THEN** a API retorna 422 e o budget não é salvo

#### Scenario: Limite nulo não restringe
- **WHEN** `limitePctPorProduto` é `null`
- **THEN** qualquer budget ≥ 0 é aceito nesse critério (a reserva mínima ainda pode aplicar)

### Requirement: Guardrail reserva mínima de capital
O sistema MUST rejeitar um save de budget que faça a soma de `budgetTesteAlocado` dos produtos em `TESTANDO`/`ESCALANDO` ultrapassar `capitalTotalDisponivel * (1 - reservaMinimaPct / 100)`.

#### Scenario: Alocação come a reserva
- **WHEN** capital é 10000, `reservaMinimaPct = 20` (teto alocável 8000), já há 7000 alocados e o operador tenta +1500
- **THEN** a API retorna 422

#### Scenario: Reserva zero
- **WHEN** `reservaMinimaPct = 0`
- **THEN** o teto alocável é 100% do capital do período
