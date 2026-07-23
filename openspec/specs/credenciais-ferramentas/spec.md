# credenciais-ferramentas Specification

## Purpose
Credenciais globais (ferramentas/infra) na página `/ferramentas`, com o mesmo padrão de segurança das credenciais por persona: AES-256-GCM, reveal com senha mestra (+ TOTP se MFA), audit log, e vínculo opcional a um registro `Ferramenta`.
## Requirements
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

### Requirement: Escopo de credencial persona vs global
O sistema SHALL persistir credenciais em uma única tabela `Credencial`, diferenciando escopo por:
- **Persona:** `global=false`, `personaId` preenchido, `ferramentaId` nulo
- **Global:** `global=true`, `personaId` nulo, `ferramentaId` opcional

#### Scenario: Credencial de persona
- **WHEN** usuário cria credencial em `/personas/{slug}/credenciais`
- **THEN** o sistema persiste com `global=false` e `personaId` da persona

#### Scenario: Credencial global
- **WHEN** usuário cria credencial na seção de Ferramentas
- **THEN** o sistema persiste com `global=true`, `personaId=null` e `ferramentaId` opcional

#### Scenario: Isolamento de listagens
- **WHEN** usuário visualiza credenciais de uma persona
- **THEN** o sistema NÃO lista credenciais com `global=true`

#### Scenario: Isolamento inverso
- **WHEN** usuário visualiza credenciais globais em Ferramentas
- **THEN** o sistema NÃO lista credenciais com `global=false`

### Requirement: Vínculo opcional com registro Ferramenta
O sistema SHALL permitir associar credencial global a um registro `Ferramenta` via campo `ferramentaId` opcional.

#### Scenario: Credencial vinculada
- **WHEN** usuário seleciona ferramenta no modal de credencial global
- **THEN** o sistema persiste `ferramentaId` e exibe nome da ferramenta na tabela

#### Scenario: Ferramenta excluída
- **WHEN** registro `Ferramenta` vinculado é excluído
- **THEN** a credencial permanece global com `ferramentaId=null` (SetNull)

### Requirement: CRUD de credenciais globais
O sistema SHALL permitir criar, editar e excluir credenciais globais via API autenticada, com valor sempre criptografado AES-256-GCM no servidor (RN-03).

#### Scenario: Criar credencial global
- **WHEN** usuário envia POST com `global=true`, `chave`, `valor` e `categoria`
- **THEN** o sistema criptografa o valor, persiste a credencial e registra audit log CRIADA

#### Scenario: Editar credencial global
- **WHEN** usuário edita metadados ou valor de credencial global via PUT
- **THEN** o sistema persiste alterações (re-criptografando valor se informado) e registra audit log EDITADA

#### Scenario: Excluir credencial global
- **WHEN** usuário exclui credencial global
- **THEN** o sistema remove o registro, registra audit log EXCLUIDA e preserva log histórico

### Requirement: API GET com filtros de escopo
O sistema SHALL estender `GET /api/credenciais` para suportar filtros mutuamente exclusivos: `personaId` (credenciais de persona), `global=true` (credenciais globais) e `ferramentaId` (subconjunto vinculado).

#### Scenario: Listar globais
- **WHEN** cliente solicita `GET /api/credenciais?global=true`
- **THEN** o sistema retorna credenciais com `global=true`, sem `valorEnc`

#### Scenario: Listar por ferramenta
- **WHEN** cliente solicita `GET /api/credenciais?global=true&ferramentaId={id}`
- **THEN** o sistema retorna apenas credenciais globais vinculadas à ferramenta

#### Scenario: Validação de escopo no POST
- **WHEN** cliente envia POST com `global=false` sem `personaId`
- **THEN** o sistema retorna 422

#### Scenario: Proibir personaId em global
- **WHEN** cliente envia POST com `global=true` e `personaId` preenchido
- **THEN** o sistema retorna 422

### Requirement: Reveal e audit log para credenciais globais
O sistema SHALL aplicar o mesmo fluxo de reveal (senha mestra + TOTP se MFA ativo) e audit log (`REVELADA`, `REVELACAO_NEGADA`) às credenciais globais, via `/api/credenciais/[id]/reveal`.

#### Scenario: Reveal credencial global
- **WHEN** usuário revela credencial global com senha mestra correta
- **THEN** o sistema retorna valor descriptografado e registra REVELADA no audit log

#### Scenario: Nunca expor valorEnc na listagem
- **WHEN** qualquer listagem de credenciais (persona ou global) é retornada
- **THEN** o sistema NÃO inclui `valorEnc` na resposta

### Requirement: Schema Prisma ferramentaId
O sistema SHALL adicionar campo opcional `ferramentaId` em `Credencial` com FK para `Ferramenta` e índice para consultas por ferramenta.

#### Scenario: Migration aplicada
- **WHEN** `prisma db push` é executado após deploy
- **THEN** coluna `ferramentaId` nullable existe em `Credencial` sem perda de dados existentes
