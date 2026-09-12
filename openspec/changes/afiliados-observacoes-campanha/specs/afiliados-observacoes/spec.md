## ADDED Requirements

### Requirement: Documento vivo da Campanha
O sistema SHALL persistir `Campanha.observacoes` como texto puro opcional, overwrite. O valor SHALL ser o documento vivo daquela campanha (plano, copy, prompt, justificativa e o que campo fechado não cobre). String vazia MUST persistir como `null`. O sistema MUST NOT tratar esse campo como diário, vigente/retirado ou HTML.

#### Scenario: Gravar observações da campanha
- **WHEN** o operador autenticado salva texto em Observações da Campanha
- **THEN** o sistema persiste o texto em `Campanha.observacoes` e o reexibe ao reabrir

#### Scenario: Apagar o bloco
- **WHEN** o operador envia o campo vazio
- **THEN** o sistema grava `null` e a campanha fica sem observações

### Requirement: Bloco não atravessa troca de campanha
Uma campanha nova do mesmo produto MUST nascer com `observacoes` nulo. O sistema MUST NOT copiar `observacoes` da campanha origem (reteste ou Falha de Execução). O texto da campanha encerrada SHALL permanecer nela.

#### Scenario: Campanha nova no mesmo produto
- **WHEN** o operador cria a campanha B para um produto cuja campanha A já tem observações
- **THEN** B nasce com `observacoes` nulo e A conserva o texto

### Requirement: Fronteira com Observações da bridge
`bridgeObservacoes` SHALL permanecer atributo da LP. Observações da Campanha MUST NOT substituir nem mesclar com `bridgeObservacoes`.

#### Scenario: Os dois textos coexistam
- **WHEN** a campanha tem `bridgeObservacoes = "pixel na thank-you"` e `observacoes` com o plano/copy
- **THEN** cada campo conserva o próprio valor após um save da ficha

### Requirement: Documento vivo do Produto
`ProdutoAfiliado.observacoes` SHALL continuar sendo o documento vivo do produto — particularidade que vale para qualquer campanha e sobrevive à troca. A edição SHALL usar o mesmo modal amplo de texto puro das Observações da Campanha. O sistema MUST NOT criar uma segunda coluna de observações no produto.

#### Scenario: Particularidade sobrevive à campanha nova
- **WHEN** o produto tem observações e o operador cria uma campanha nova
- **THEN** as observações do produto permanecem e a campanha nova não as recebe como `Campanha.observacoes`

### Requirement: Modal amplo compartilhado
O sistema SHALL oferecer um modal autenticado com textarea grande (texto puro, sem formatação) para editar Observações da Campanha e Observações do Produto. A mesma superfície MUST servir os dois grãos, só mudando o alvo persistido e o rótulo.

#### Scenario: Abrir o editor na ficha
- **WHEN** o operador abre Observações da Campanha na ficha
- **THEN** um modal amplo exibe o texto atual (ou vazio) e permite gravar

#### Scenario: Abrir o editor no catálogo
- **WHEN** o operador abre Observações do Produto no catálogo
- **THEN** o mesmo tipo de modal amplo exibe e grava `ProdutoAfiliado.observacoes`

#### Scenario: Sem sessão
- **WHEN** um visitante sem sessão tenta gravar observações de campanha ou de produto
- **THEN** o sistema rejeita (redirect de auth ou 401)
