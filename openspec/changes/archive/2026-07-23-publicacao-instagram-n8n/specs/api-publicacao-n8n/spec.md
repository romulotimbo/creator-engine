## ADDED Requirements

### Requirement: Armazenamento de mídia por post
O sistema SHALL armazenar arquivos de publicação em volume dedicado (`/data/publicacao`) organizados por `postId`, registrando path relativo, MIME type e token de acesso na entidade `Post`.

#### Scenario: Registro de mídia para um post
- **WHEN** o n8n ou um operador autenticado chama `POST /api/publicacao/posts/{id}/midia` com arquivo válido (JPEG/PNG/MP4)
- **THEN** o sistema grava o arquivo em `/data/publicacao/{postId}/`, preenche `midiaPath`, `midiaMime`, `midiaToken` e define `publicacaoStatus=PRONTA`

#### Scenario: Rejeição de mídia para post inexistente
- **WHEN** o `postId` não existe no schema `creator_engine`
- **THEN** o sistema retorna 404 e não grava arquivo

### Requirement: URL pública de mídia para consumo externo
O sistema SHALL expor `GET /api/publicacao/media/{postId}?token={midiaToken}` sem autenticação de sessão, validando o token contra o registro do post.

#### Scenario: Download bem-sucedido pelo Zernio
- **WHEN** uma requisição GET inclui `token` válido para um post com mídia registrada
- **THEN** o sistema retorna o arquivo com `Content-Type` correto e status 200

#### Scenario: Token inválido ou ausente
- **WHEN** o token não corresponde ao `midiaToken` do post ou está ausente
- **THEN** o sistema retorna 401 ou 404 sem revelar existência do arquivo

### Requirement: Fila de publicação para automação
O sistema SHALL expor `GET /api/publicacao/fila` autenticado por `X-Publish-Token`, retornando posts elegíveis para publicação imediata.

#### Scenario: Post elegível na fila
- **WHEN** um post tem `status=AGENDADO`, `publicacaoStatus=PRONTA`, `dataPublicacao <= now()`, `contaId` com plataforma Instagram e mídia registrada
- **THEN** o item aparece na fila com `postId`, `ordem`, `titulo`, `personaSlug`, `contaHandle`, `zernioContentType`, `mediaUrl` e `dataPublicacao`

#### Scenario: Post sem mídia não entra na fila
- **WHEN** `publicacaoStatus` é `SEM_MIDIA` ou `midiaPath` está vazio
- **THEN** o post NÃO aparece na fila

#### Scenario: Persona BANIDA excluída
- **WHEN** a persona do post tem status `BANIDA`
- **THEN** o post NÃO aparece na fila (RN-04 estendida à publicação)

### Requirement: Detalhe de post para montagem do payload Zernio
O sistema SHALL expor `GET /api/publicacao/posts/{id}` autenticado por token, retornando todos os campos necessários para o n8n montar `POST /v1/posts` no Zernio.

#### Scenario: Detalhe completo
- **WHEN** o n8n consulta um post da fila
- **THEN** a resposta inclui `zernioContentType`, `mediaUrl`, `contaPlataforma`, `personaSlug` e metadados de publicação atuais

### Requirement: Confirmação de publicação bem-sucedida
O sistema SHALL expor `POST /api/publicacao/posts/{id}/confirmar` para o n8n registrar sucesso após resposta do Zernio.

#### Scenario: Marcar post como publicado
- **WHEN** o n8n envia `{ zernioPostId, platformPostUrl? }` após publish OK
- **THEN** o sistema seta `status=PUBLICADO`, `dataStatus=now()`, `dataPublicacao` preservada ou atualizada, `publicacaoStatus=PUBLICADA`, `zernioPostId` e `platformPostUrl` preenchidos, `publicacaoEnviadaEm=now()`

#### Scenario: Idempotência em confirmação duplicada
- **WHEN** o n8n reenvia confirmação para post já `PUBLICADO`
- **THEN** o sistema retorna 200 sem alterar timestamps existentes

### Requirement: Registro de falha de publicação
O sistema SHALL expor `POST /api/publicacao/posts/{id}/erro` para o n8n registrar falhas.

#### Scenario: Falha no Zernio
- **WHEN** o n8n envia `{ mensagem, zernioPostId? }` após erro
- **THEN** o sistema seta `publicacaoStatus=ERRO`, preenche `publicacaoErro` e mantém `status=AGENDADO` para retry operacional

### Requirement: Marcação de envio em andamento
O sistema SHALL permitir que o n8n marque `publicacaoStatus=ENVIANDO` ao iniciar o handoff ao Zernio (via campo no confirmar prévio ou endpoint dedicado `POST .../enviando`).

#### Scenario: Lock otimista antes do Zernio
- **WHEN** o n8n inicia publicação de um item da fila
- **THEN** o sistema seta `publicacaoStatus=ENVIANDO` e o post deixa de aparecer em consultas concorrentes da fila até conclusão ou erro

### Requirement: Override de tipo de conteúdo Instagram
O sistema SHALL suportar `publicacaoTipo` no `Post` para override do mapeamento CE→Zernio (`STORY`, `REEL`, `FEED`, `CARROSSEL`).

#### Scenario: Piloto 523 publicado como Story
- **WHEN** o post 523 tem `tipo=REEL` mas `publicacaoTipo=STORY`
- **THEN** a fila retorna `zernioContentType=story`

### Requirement: Autenticação machine-to-machine
Todas as rotas `/api/publicacao/*` (exceto servir mídia por token) SHALL exigir header `X-Publish-Token` igual a `N8N_PUBLISH_TOKEN` configurado no ambiente.

#### Scenario: Requisição sem token
- **WHEN** o header está ausente ou incorreto
- **THEN** o sistema retorna 401 Unauthorized

### Requirement: Piloto roteiro 523
O sistema SHALL incluir script ou procedimento documentado para registrar a mídia `523-hoje-tambem-teve/512/v1.jpg`, setar `publicacaoTipo=STORY`, `publicacaoStatus=PRONTA`, `status=AGENDADO`, `dataPublicacao=now()` e vincular conta Instagram @veesemfiltro.

#### Scenario: Post 523 pronto na fila após script piloto
- **WHEN** o script piloto é executado em ambiente com post ordem 523 existente
- **THEN** `GET /api/publicacao/fila` retorna o post 523 com `mediaUrl` HTTPS válida
