## ADDED Requirements

### Requirement: Modelo de roteiro de estilização em timeline
O sistema SHALL representar um roteiro de estilização como uma timeline estruturada composta por tracks com tipo, intervalo de tempo (em segundos), conteúdo e animação, persistida de forma serializável e associada a uma fonte, template e formato.

#### Scenario: Track de texto com tempo e animação
- **WHEN** o operador adiciona uma direção "do segundo 00 ao 05, texto X com animação write-on"
- **THEN** o roteiro passa a conter uma track do tipo `texto` com `inicio=0`, `fim=5`, `conteudo="X"` e `animacao="write-on"`

#### Scenario: Track de asset referenciado por tag
- **WHEN** o operador adiciona uma direção para exibir um asset por sua tag num intervalo
- **THEN** o roteiro contém uma track do tipo `asset` com a `assetTag` referenciada e o intervalo de tempo

### Requirement: Validação do roteiro
O sistema SHALL validar o roteiro (Zod no servidor) antes de aceitá-lo para render, garantindo integridade dos intervalos, existência das tags e conformidade dos estilos.

#### Scenario: Intervalo fora da duração é rejeitado
- **WHEN** uma track tem `fim` maior que a duração da fonte associada
- **THEN** a validação falha indicando a track e o intervalo inválido

#### Scenario: Tag de asset inexistente é rejeitada
- **WHEN** uma track de asset referencia uma `assetTag` que não existe na biblioteca
- **THEN** a validação falha indicando a tag inexistente

#### Scenario: Estilo de texto fora da hierarquia Tactical Rebel é rejeitado
- **WHEN** uma track de texto usa um `estilo` que não pertence à hierarquia definida (ex.: `impacto`, `conviccao`)
- **THEN** a validação falha indicando o estilo inválido

### Requirement: Biblioteca de assets com tags
O sistema SHALL manter uma biblioteca de assets de estilização identificados por tag única, referenciáveis pelos roteiros.

#### Scenario: Cadastro de asset com tag única
- **WHEN** o operador cadastra um asset com uma tag
- **THEN** o asset fica disponível para referência por roteiros e a tag é única na biblioteca

#### Scenario: Tag duplicada é rejeitada
- **WHEN** o operador tenta cadastrar um asset com uma tag já existente
- **THEN** o sistema rejeita o cadastro por violação de unicidade

### Requirement: Edição e preview do roteiro
O sistema SHALL permitir editar o roteiro na interface e visualizar uma prévia antes de disparar o render final.

#### Scenario: Preview reflete o roteiro atual
- **WHEN** o operador edita tracks e solicita a prévia
- **THEN** a prévia reflete o conteúdo, tempos e animações do roteiro corrente sem exigir o render final na VPS
