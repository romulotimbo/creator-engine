## ADDED Requirements

### Requirement: Validação RN-01 duplicidade dolphin/proxy
O sistema SHALL rejeitar criação ou edição de persona se `dolphinProfileId` ou `proxyRef` já estiver em uso por outra persona.

#### Scenario: Dolphin profile duplicado
- **WHEN** usuário tenta salvar persona com `dolphinProfileId` já usado
- **THEN** o sistema retorna erro 409 com mensagem indicando persona conflitante

#### Scenario: Proxy duplicado
- **WHEN** usuário tenta salvar persona com `proxyRef` já usado
- **THEN** o sistema retorna erro 409 com mensagem indicando persona conflitante

### Requirement: MFA TOTP opcional
O sistema SHALL permitir ativar TOTP no perfil do usuário com QR code e validação de código de 6 dígitos.

#### Scenario: Ativar TOTP
- **WHEN** usuário habilita MFA e escaneia QR + confirma código válido
- **THEN** o sistema armazena secret criptografado e marca `totpEnabled = true`

#### Scenario: Login com TOTP ativo
- **WHEN** usuário com TOTP ativo faz login
- **THEN** o sistema exige segundo fator antes de emitir JWT

### Requirement: Reveal de credenciais com TOTP
O sistema SHALL exigir código TOTP válido além da senha mestra para reveal quando MFA está ativo (RN-03).

#### Scenario: Reveal com MFA
- **WHEN** usuário solicita reveal com senha correta e TOTP válido
- **THEN** o sistema retorna valor descriptografado e registra audit log REVELADA

#### Scenario: Reveal sem TOTP quando exigido
- **WHEN** usuário envia senha correta mas TOTP ausente ou inválido
- **THEN** o sistema retorna 403 e registra REVELACAO_NEGADA

### Requirement: Rate limiting em APIs
O sistema SHALL limitar requisições a `/api/*` a 100 por minuto por IP, retornando 429 quando excedido.

#### Scenario: Limite excedido
- **WHEN** mesmo IP excede 100 requisições em 60 segundos
- **THEN** o sistema responde 429 Too Many Requests
