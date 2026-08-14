## ADDED Requirements

### Requirement: Escopo de credencial ContaTrafego
O sistema SHALL permitir credenciais vinculadas a uma ContaTrafego na mesma tabela `Credencial`, com `global=false`, `personaId` nulo, `contaTrafegoId` preenchido e `ferramentaId` nulo — mutuamente exclusivo com escopos persona e global.

#### Scenario: Criar credencial no hub de afiliados
- **WHEN** usuário cria credencial em `/afiliados/{slug}/credenciais`
- **THEN** o sistema persiste com `contaTrafegoId` da conta, `global=false` e `personaId=null`

#### Scenario: Rejeitar escopos mistos
- **WHEN** cliente envia POST com `contaTrafegoId` e `personaId` (ou `global=true`) juntos
- **THEN** o sistema retorna 422

#### Scenario: Isolamento vs persona
- **WHEN** usuário lista credenciais de uma persona
- **THEN** o sistema NÃO inclui credenciais com `contaTrafegoId` preenchido

#### Scenario: Isolamento vs global
- **WHEN** usuário lista credenciais globais em `/ferramentas`
- **THEN** o sistema NÃO inclui credenciais de ContaTrafego

#### Scenario: Isolamento entre contas de tráfego
- **WHEN** usuário lista credenciais da ContaTrafego A
- **THEN** o sistema NÃO lista credenciais da ContaTrafego B

### Requirement: Reveal e audit log no escopo ContaTrafego
O sistema SHALL aplicar o mesmo fluxo de reveal (senha mestra + TOTP se MFA) e audit log às credenciais de ContaTrafego via `/api/credenciais/[id]/reveal`.

#### Scenario: Reveal credencial de ContaTrafego
- **WHEN** usuário revela credencial do hub de afiliados com senha mestra correta
- **THEN** o sistema retorna valor descriptografado e registra REVELADA

#### Scenario: Listagem sem valorEnc
- **WHEN** listagem de credenciais de ContaTrafego é retornada
- **THEN** a resposta NÃO inclui `valorEnc`

### Requirement: API GET com filtro contaTrafegoId
O sistema SHALL estender `GET /api/credenciais` para aceitar filtro `contaTrafegoId`, mutuamente exclusivo com `personaId` e `global=true`.

#### Scenario: Listar por ContaTrafego
- **WHEN** cliente solicita `GET /api/credenciais?contaTrafegoId={id}`
- **THEN** o sistema retorna apenas credenciais daquela conta, sem `valorEnc`

## MODIFIED Requirements

### Requirement: Escopo de credencial persona vs global
O sistema SHALL persistir credenciais em uma única tabela `Credencial`, diferenciando escopo por:
- **Persona:** `global=false`, `personaId` preenchido, `contaTrafegoId` nulo, `ferramentaId` nulo
- **ContaTrafego:** `global=false`, `contaTrafegoId` preenchido, `personaId` nulo, `ferramentaId` nulo
- **Global:** `global=true`, `personaId` nulo, `contaTrafegoId` nulo, `ferramentaId` opcional

#### Scenario: Credencial de persona
- **WHEN** usuário cria credencial em `/personas/{slug}/credenciais`
- **THEN** o sistema persiste com `global=false`, `personaId` da persona e `contaTrafegoId=null`

#### Scenario: Credencial de ContaTrafego
- **WHEN** usuário cria credencial em `/afiliados/{slug}/credenciais`
- **THEN** o sistema persiste com `global=false`, `contaTrafegoId` da conta e `personaId=null`

#### Scenario: Credencial global
- **WHEN** usuário cria credencial na seção de Ferramentas
- **THEN** o sistema persiste com `global=true`, `personaId=null`, `contaTrafegoId=null` e `ferramentaId` opcional

#### Scenario: Isolamento de listagens persona
- **WHEN** usuário visualiza credenciais de uma persona
- **THEN** o sistema NÃO lista credenciais com `global=true` nem com `contaTrafegoId` preenchido

#### Scenario: Isolamento inverso global
- **WHEN** usuário visualiza credenciais globais em Ferramentas
- **THEN** o sistema NÃO lista credenciais com `global=false`

### Requirement: API GET com filtros de escopo
O sistema SHALL estender `GET /api/credenciais` para suportar filtros mutuamente exclusivos: `personaId` (credenciais de persona), `contaTrafegoId` (credenciais de ContaTrafego), `global=true` (credenciais globais) e `ferramentaId` (subconjunto global vinculado).

#### Scenario: Listar globais
- **WHEN** cliente solicita `GET /api/credenciais?global=true`
- **THEN** o sistema retorna credenciais com `global=true`, sem `valorEnc`

#### Scenario: Listar por ContaTrafego
- **WHEN** cliente solicita `GET /api/credenciais?contaTrafegoId={id}`
- **THEN** o sistema retorna apenas credenciais daquela ContaTrafego, sem `valorEnc`

#### Scenario: Listar por ferramenta
- **WHEN** cliente solicita `GET /api/credenciais?global=true&ferramentaId={id}`
- **THEN** o sistema retorna apenas credenciais globais vinculadas à ferramenta

#### Scenario: Validação de escopo no POST
- **WHEN** cliente envia POST com `global=false` sem `personaId` e sem `contaTrafegoId`
- **THEN** o sistema retorna 422

#### Scenario: Proibir personaId em global
- **WHEN** cliente envia POST com `global=true` e `personaId` preenchido
- **THEN** o sistema retorna 422

#### Scenario: Proibir contaTrafegoId em global
- **WHEN** cliente envia POST com `global=true` e `contaTrafegoId` preenchido
- **THEN** o sistema retorna 422
