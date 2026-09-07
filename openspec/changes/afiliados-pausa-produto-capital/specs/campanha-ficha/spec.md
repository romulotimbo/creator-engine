## ADDED Requirements

### Requirement: Log do cascade de pausa do produto
Quando `Campanha.status` muda para `PAUSADO` porque o produto foi pausado ou arquivado, o sistema SHALL gravar `CampanhaStatusLog` com `statusAnterior`, `statusNovo = PAUSADO` e motivo que identifica a origem (pausa ou arquivo do produto). A ficha SHALL exibir essa linha no histórico. A ficha SHALL deixar explícito que a pausa no Creator Engine não pausa a campanha no Google Ads.

#### Scenario: Histórico mostra origem produto
- **WHEN** o operador pausa o produto e a campanha `TESTANDO` vira `PAUSADO`
- **THEN** a ficha lista um log `TESTANDO → PAUSADO` com motivo de pausa do produto

#### Scenario: Aviso de fronteira Ads
- **WHEN** o operador abre a ficha de uma campanha `PAUSADO`
- **THEN** a UI informa que o registro não escreve no Google Ads

## MODIFIED Requirements

### Requirement: Histórico de status da campanha
O sistema SHALL registrar toda mudança de `Campanha.status` em `CampanhaStatusLog` (mesmo formato de `PersonaStatusLog`: status anterior, novo status, timestamp, motivo opcional), exibido na ficha como histórico somente leitura. Isso inclui transições disparadas pelo cascade de `ProdutoAfiliado.status`.

#### Scenario: Mudança de status gera log
- **WHEN** o operador muda `Campanha.status` de `TESTANDO` para `ESCALANDO`
- **THEN** o sistema cria uma entrada em `CampanhaStatusLog` com os dois status e o timestamp

#### Scenario: Cascade do produto gera log
- **WHEN** o produto é pausado e a campanha passa de `ESCALANDO` para `PAUSADO`
- **THEN** o sistema cria uma entrada em `CampanhaStatusLog` com motivo de pausa do produto
