## ADDED Requirements

### Requirement: Audit log unificado para credenciais globais
O sistema SHALL registrar no mesmo model `CredencialLog` todas as ações (CRIADA, EDITADA, EXCLUIDA, REVELADA, REVELACAO_NEGADA) de credenciais globais, com `credencialChave` e `usuarioEmail`, independentemente do escopo.

#### Scenario: Log de credencial global criada
- **WHEN** usuário cria credencial global em Ferramentas
- **THEN** o sistema registra entrada CRIADA no audit log visível na seção de Ferramentas

#### Scenario: Log de reveal global
- **WHEN** usuário revela credencial global com sucesso
- **THEN** o sistema registra REVELADA no audit log da seção Ferramentas

## MODIFIED Requirements

### Requirement: Reveal de credenciais com TOTP
O sistema SHALL exigir código TOTP válido além da senha mestra para reveal de **qualquer credencial** (persona ou global) quando MFA está ativo (RN-03).

#### Scenario: Reveal com MFA em credencial de persona
- **WHEN** usuário solicita reveal de credencial de persona com senha correta e TOTP válido
- **THEN** o sistema retorna valor descriptografado e registra audit log REVELADA

#### Scenario: Reveal com MFA em credencial global
- **WHEN** usuário solicita reveal de credencial global em Ferramentas com senha correta e TOTP válido
- **THEN** o sistema retorna valor descriptografado e registra audit log REVELADA

#### Scenario: Reveal sem TOTP quando exigido
- **WHEN** usuário envia senha correta mas TOTP ausente ou inválido em reveal de credencial persona ou global
- **THEN** o sistema retorna 403 e registra REVELACAO_NEGADA
