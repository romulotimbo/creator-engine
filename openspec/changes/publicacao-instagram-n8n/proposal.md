## Why

O Creator Engine já agenda posts (`AGENDADO` + `dataPublicacao` + `contaId`), mas a publicação no Instagram ainda é manual. Na VPS já existe integração **Zernio** via **n8n** (DMs @veesemfiltro). Falta a ponte: servir mídia pronta com URL pública, expor fila de publicação para o n8n e atualizar o status do `Post` após envio — começando pelo piloto do roteiro **523** (story).

## What Changes

- Volume `/data/publicacao` na VPS (compartilhado com `creator-engine-api`) para armazenar mídias prontas por `postId`
- Endpoint de **upload/registro de mídia** vinculado ao `Post` (piloto: copiar `523-hoje-tambem-teve/512/v1.jpg`)
- Endpoint **público (token)** para o Zernio buscar a imagem via HTTPS (`mediaItems.url`)
- API de **fila de publicação** para o n8n: posts elegíveis (`AGENDADO`, data vencida, mídia registrada, conta Instagram)
- API de **confirmação/erro** para o n8n atualizar `Post` → `PUBLICADO` ou registrar falha
- Campos opcionais no `Post` para rastrear publicação externa (`publicacaoStatus`, `zernioPostId`, `platformPostUrl`, `publicacaoErro`)
- Especificação documentada do **workflow n8n** (não implementado neste repositório) para consumir a API e chamar Zernio
- Piloto imediato: roteiro ordem **523**, publicar como **Instagram Story** via Zernio

## Capabilities

### New Capabilities

- `api-publicacao-n8n`: Endpoints, volume de mídia, modelo de dados e autenticação máquina-a-máquina para o n8n consultar fila, obter URL de mídia e confirmar publicação
- `workflow-n8n-publicacao-instagram`: Especificação do fluxo n8n (cron + Zernio + callbacks CE) — documentação operacional, implementação no n8n.romulohub.cloud

### Modified Capabilities

- (nenhuma — calendário e agendamento permanecem; esta change adiciona a camada de execução)

## Impact

- **Schema Prisma:** novos campos em `Post` (publicação externa); possível model `MidiaPublicacao` leve
- **API:** rotas `/api/publicacao/*` com auth por token (`N8N_PUBLISH_TOKEN` ou header dedicado)
- **Infra VPS:** volume Docker `creator-engine-publicacao-data` montado em `/data/publicacao`; URL pública via Traefik no subpath do Creator Engine
- **Segredos:** `N8N_PUBLISH_TOKEN` no `.env` da API; `ZERNIO_API_KEY` permanece no n8n
- **n8n:** novo workflow (fora do repo) — spec em `specs/workflow-n8n-publicacao-instagram/spec.md`
- **Piloto:** post ordem 523 (`cmrfhpdmw0001x4pgty00x6zz`), imagem `scripts/nano-banana-batch/posts/523-hoje-tambem-teve/512/v1.jpg`
