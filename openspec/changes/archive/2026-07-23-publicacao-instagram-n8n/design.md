## Context

O Creator Engine agenda posts em `creator_engine.Post` (`AGENDADO`, `dataPublicacao`, `contaId`), mas a publicação no Instagram é manual. Na VPS (`romulohub.cloud`) o **n8n** já integra **Zernio** para DMs (@veesemfiltro); a API Zernio também publica **Stories, Reels e Feed** via `POST /v1/posts`, exigindo `mediaItems[].url` pública HTTPS.

O piloto imediato é o roteiro **523** (`hoje também teve`, imagem em `scripts/nano-banana-batch/posts/523-hoje-tambem-teve/512/v1.jpg`), publicado como **Instagram Story** — apesar do `tipo=REEL` no CE, o `contentType` Zernio será `story` (9:16).

## Goals / Non-Goals

**Goals:**
- Armazenar mídia pronta por `postId` em volume VPS (`/data/publicacao`)
- Expor URL pública temporária/permanente para o Zernio consumir a imagem
- API machine-to-machine (token) para o n8n: fila, detalhe, confirmar sucesso, registrar erro
- Atualizar `Post.status` e campos de rastreio após publicação
- Documentar workflow n8n completo (implementação fora deste repo)
- Habilitar piloto do post ordem **523** no mesmo deploy

**Non-Goals:**
- Implementar o workflow n8n no repositório Creator Engine
- UI de publicação na sidebar (v1 é API + piloto manual/script)
- Suporte TikTok/YouTube nesta change
- Agendamento Zernio nativo substituindo o calendário CE (CE continua fonte da verdade do *quando*)
- Webhook push CE→n8n (v1.1; v1 usa poll do n8n)

## Decisions

### D1 — n8n como executor, CE como fonte da verdade
O calendário CE define *o quê* e *quando*; o n8n dispara na hora e chama Zernio. O CE não guarda `ZERNIO_API_KEY` — só token de integração n8n↔CE.
- *Alternativa:* CE chama Zernio direto — rejeitada na v1 para reutilizar padrão operacional dos DMs e manter retries/logs no n8n.

### D2 — Volume `/data/publicacao` + rota pública de mídia
Estrutura: `/data/publicacao/{postId}/v1.jpg` (ou extensão original). Montagem no `creator-engine-api` igual ao estúdio (`creator-engine-estudio-data`).
URL pública: `https://romulohub.cloud/creator-engine/api/publicacao/media/{postId}?token={MEDIA_ACCESS_TOKEN}` — token HMAC ou UUID gravado no registro da mídia, rotacionável.
- *Alternativa:* CDN externa — rejeitada no piloto; Traefik já serve a API.

### D3 — Campos de publicação no `Post` (sem tabela nova na v1)
Novos campos em `Post`:
| Campo | Tipo | Uso |
|---|---|---|
| `publicacaoStatus` | enum | `SEM_MIDIA` \| `PRONTA` \| `ENVIANDO` \| `PUBLICADA` \| `ERRO` |
| `publicacaoTipo` | enum opcional | Override Zernio: `STORY` \| `REEL` \| `FEED` \| `CARROSSEL` (default derivado de `tipo`) |
| `midiaPath` | string? | Path relativo no volume |
| `midiaMime` | string? | `image/jpeg`, `video/mp4`, … |
| `midiaToken` | string? | Token da URL pública |
| `zernioPostId` | string? | ID retornado pelo Zernio |
| `platformPostUrl` | string? | URL no Instagram após publish |
| `publicacaoErro` | text? | Mensagem de falha |
| `publicacaoEnviadaEm` | DateTime? | Timestamp de handoff ao Zernio |

Transições de `Post.status`:
- Fila elegível: `status=AGENDADO` + `publicacaoStatus=PRONTA` + `dataPublicacao <= now()`
- Ao n8n iniciar: `publicacaoStatus=ENVIANDO`
- Sucesso: `status=PUBLICADO`, `dataStatus=now()`, `publicacaoStatus=PUBLICADA`
- Falha: `publicacaoStatus=ERRO` (mantém `AGENDADO` para retry manual)

### D4 — Autenticação API n8n
Header obrigatório: `X-Publish-Token: {N8N_PUBLISH_TOKEN}` em todas as rotas `/api/publicacao/*` exceto `GET .../media/{postId}` (autentica por `?token=`).
Token gerado com `openssl rand -hex 32` no `.env` da API e replicado como credencial HTTP Header no n8n.
Rotas de mídia pública: sem sessão NextAuth; validação por `midiaToken` query param.

### D5 — Endpoints v1

| Método | Rota | Auth | Função |
|---|---|---|---|
| `GET` | `/api/publicacao/fila` | Token | Posts elegíveis (filtros: `plataforma`, `limite`) |
| `GET` | `/api/publicacao/posts/[id]` | Token | Detalhe completo para montar payload Zernio |
| `POST` | `/api/publicacao/posts/[id]/midia` | Token + sessão* | Upload multipart ou registro por `sourcePath` (dev/admin) |
| `GET` | `/api/publicacao/media/[postId]` | `?token=` | Serve arquivo (Content-Type correto, cache curto) |
| `POST` | `/api/publicacao/posts/[id]/confirmar` | Token | Marca PUBLICADO + metadados Zernio |
| `POST` | `/api/publicacao/posts/[id]/erro` | Token | Marca ERRO + mensagem |

\* Upload via sessão NextAuth na UI futura; no piloto, endpoint token-only aceita `multipart/form-data` ou body JSON `{ copyFrom: "relative/path" }` restrito a paths sob `/data/publicacao` ou script de deploy.

Resposta da fila (exemplo):
```json
{
  "items": [{
    "postId": "cmrfhpdmw0001x4pgty00x6zz",
    "ordem": 523,
    "titulo": "hoje também teve",
    "personaSlug": "veesemfiltro",
    "contaHandle": "veesemfiltro",
    "plataforma": "INSTAGRAM",
    "zernioContentType": "story",
    "mediaUrl": "https://romulohub.cloud/creator-engine/api/publicacao/media/cmrfhpdmw0001x4pgty00x6zz?token=...",
    "dataPublicacao": "2026-07-11T18:00:00.000Z"
  }]
}
```

Mapeamento `zernioContentType`:
- `Post.publicacaoTipo` se definido
- senão: `STORY→story`, `REEL→reels`, `IMAGEM→feed`, `CARROSSEL→carousel` (default feed)

### D6 — Piloto roteiro 523
1. `db push` com novos campos
2. Script `scripts/publicacao/register-pilot-523.mjs`: copia `v1.jpg` → volume, seta `publicacaoStatus=PRONTA`, `publicacaoTipo=STORY`, `status=AGENDADO`, `dataPublicacao=now()`, vincula `contaId` Instagram
3. n8n workflow manual dispara `GET fila` → `POST Zernio` → `POST confirmar`
4. Verificar story live + `status=PUBLICADO` no CE

### D7 — Workflow n8n (spec separada, não no repo)
Dois workflows documentados em `specs/workflow-n8n-publicacao-instagram/spec.md`:
- **Piloto manual** (trigger manual, post 523)
- **Produção** (cron 5 min, fila automática)

## Risks / Trade-offs

- **[Risco] URL de mídia acessível publicamente** → Mitigação: token obrigatório na query; sem listagem de diretório; TTL opcional v1.1
- **[Risco] Zernio não alcança URL interna** → Mitigação: URL via Traefik HTTPS pública; testar com `curl` antes do piloto
- **[Risco] Post 523 sem `contaId`** → Mitigação: script piloto seta conta Instagram da persona
- **[Risco] `tipo=REEL` vs publish story** → Mitigação: campo `publicacaoTipo=STORY` no piloto
- **[Risco] Mídia local só no dev** → Mitigação: deploy copia arquivo na VPS ou upload via endpoint antes do n8n rodar

## Migration Plan

1. Adicionar campos ao `schema.prisma` + `prisma db push` (dev e VPS)
2. Adicionar volume `creator-engine-publicacao-data` no `docker-compose.prod.yml`
3. Variáveis: `N8N_PUBLISH_TOKEN`, `PUBLICACAO_DATA_DIR=/data/publicacao`, `PUBLICACAO_MEDIA_BASE_URL`
4. Deploy API; rodar script piloto 523 na VPS
5. Criar workflow n8n manual seguindo spec; testar publish
6. Ativar workflow cron após piloto OK

Rollback: desativar workflows n8n; novos campos são opcionais e não quebram UI existente.

## Open Questions

- `accountId` Zernio do @veesemfiltro — obter do painel Zernio antes do piloto (não commitar)
- Confirmar base URL exata da API Zernio na conta (`https://api.zernio.com/v1` vs variante)
- Após piloto: webhook Zernio → n8n para confirmar sem poll?

## Checklist operacional (pós-implementação CE)

1. `npm run db:push` (dev/VPS) ou `psql ... -f prisma/sql/03-publicacao-instagram.sql`
2. Configurar `N8N_PUBLISH_TOKEN`, `PUBLICACAO_DATA_DIR`, `PUBLICACAO_MEDIA_BASE_URL` no `.env` da API
3. Deploy com volume `creator-engine-publicacao-data` montado em `/data/publicacao`
4. Executar `node scripts/publicacao/register-pilot-523.mjs` (piloto roteiro 523)
5. Smoke: `GET /api/publicacao/fila` + `curl -I` na `mediaUrl`
6. n8n: credencial `N8N_PUBLISH_TOKEN`, env `ZERNIO_INSTAGRAM_ACCOUNT_ID`, workflow manual piloto
7. Disparar piloto → story live + `status=PUBLICADO` no CE
8. Ativar workflow cron (5 min) após piloto OK

Detalhes: `scripts/publicacao/README.md` e `specs/workflow-n8n-publicacao-instagram/spec.md`.
