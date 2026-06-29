## MODIFIED Requirements

### Requirement: Seção de credenciais globais em Ferramentas
O sistema SHALL exibir na página `/ferramentas` uma seção "Credenciais globais" com tabela CRUD, reveal e log de auditoria, incluindo colunas **Serviço** (`servico` ou nome da Ferramenta vinculada), **Categoria**, **Chave**, **Valor** (mascarado) e **Notas**.

#### Scenario: Acesso autenticado
- **WHEN** usuário logado navega para `/ferramentas`
- **THEN** o sistema exibe o dashboard de ferramentas existente e, abaixo, a seção de credenciais globais com tabela e audit log

#### Scenario: Estado vazio
- **WHEN** não existem credenciais com `global=true`
- **THEN** a seção exibe mensagem orientando cadastro de credencial global

#### Scenario: Falha de schema não bloqueia ferramentas
- **WHEN** query de credenciais falha por coluna ausente no banco
- **THEN** a seção de ferramentas permanece funcional e credenciais exibem aviso de migration
