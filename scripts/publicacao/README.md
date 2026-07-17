# Publicação Instagram (n8n + Zernio)

Ponte machine-to-machine entre o Creator Engine e o n8n para publicar posts agendados no Instagram via Zernio.

## Variáveis

| Variável | Descrição |
|---|---|
| `N8N_PUBLISH_TOKEN` | Token M2M (`openssl rand -hex 32`) — header `X-Publish-Token` |
| `PUBLICACAO_DATA_DIR` | Volume local de mídias (default `/data/publicacao`) |
| `PUBLICACAO_MEDIA_BASE_URL` | URL pública base das mídias (prod: `https://romulohub.cloud/creator-engine/api/publicacao/media`) |

## Endpoints

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/publicacao/fila` | `X-Publish-Token` |
| GET | `/api/publicacao/posts/[id]` | `X-Publish-Token` |
| POST | `/api/publicacao/posts/[id]/midia` | `X-Publish-Token` |
| POST | `/api/publicacao/posts/[id]/enviando` | `X-Publish-Token` |
| POST | `/api/publicacao/posts/[id]/confirmar` | `X-Publish-Token` |
| POST | `/api/publicacao/posts/[id]/erro` | `X-Publish-Token` |
| GET | `/api/publicacao/media/[postId]?token=` | query token |

## Piloto roteiro 523

```bash
# 1. Schema
npm run db:push && npm run db:generate

# 2. Registrar mídia + status PRONTA
N8N_PUBLISH_TOKEN=seu-token \
PUBLICACAO_DATA_DIR=./tmp/publicacao \
node scripts/publicacao/register-pilot-523.mjs

# 3. Smoke test (com npm run dev rodando)
N8N_PUBLISH_TOKEN=seu-token node scripts/publicacao/smoke-fila.mjs
```

## Deploy VPS

1. Adicionar ao `.env` em `/srv/data/creator-engine-api`:
   ```env
   N8N_PUBLISH_TOKEN=...
   PUBLICACAO_DATA_DIR=/data/publicacao
   PUBLICACAO_MEDIA_BASE_URL=https://romulohub.cloud/creator-engine/api/publicacao/media
   ```
2. `bash scripts/deploy-vps.sh`
3. Executar piloto dentro do container ou no host:
   ```bash
   docker exec creator-engine-api node scripts/publicacao/register-pilot-523.mjs
   ```
4. Validar mídia:
   ```bash
   curl -I "https://romulohub.cloud/creator-engine/api/publicacao/media/{postId}?token=..."
   ```

## Checklist n8n (fora do repo)

Implementar em `https://n8n.romulohub.cloud/` conforme `openspec/changes/publicacao-instagram-n8n/specs/workflow-n8n-publicacao-instagram/spec.md`:

1. Credencial HTTP Header Auth `N8N_PUBLISH_TOKEN` → header `X-Publish-Token`
2. Env `ZERNIO_INSTAGRAM_ACCOUNT_ID` (painel Zernio, @veesemfiltro)
3. Env `CE_PUBLICACAO_BASE_URL=https://romulohub.cloud/creator-engine/api/publicacao`
4. Workflow manual **Instagram Story — Piloto 523**
5. Após piloto OK: workflow cron **Instagram Publicação — Produção** (5 min)

### Pré-piloto

- [ ] Script piloto executado no CE
- [ ] `GET /api/publicacao/fila` retorna post 523 com `mediaUrl`
- [ ] `curl -I` na `mediaUrl` retorna 200
- [ ] `ZERNIO_INSTAGRAM_ACCOUNT_ID` configurado no n8n
- [ ] Disparar workflow manual → story live + `status=PUBLICADO` no CE
