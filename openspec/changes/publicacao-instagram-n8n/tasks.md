## 1. Schema e configuração

- [x] 1.1 Adicionar enum `PublicacaoStatus` e `PublicacaoTipo` + campos de publicação em `Post` no `schema.prisma`
- [x] 1.2 Rodar `prisma db push` em dev e documentar SQL idempotente em `prisma/sql/03-publicacao-instagram.sql`
- [x] 1.3 Adicionar variáveis em `.env.example`: `N8N_PUBLISH_TOKEN`, `PUBLICACAO_DATA_DIR`, `PUBLICACAO_MEDIA_BASE_URL`
- [x] 1.4 Criar `src/lib/publicacao.ts` — auth token, paths do volume, mapeamento `zernioContentType`, geração `midiaToken`

## 2. Infra VPS

- [x] 2.1 Adicionar volume `creator-engine-publicacao-data` em `docker-compose.prod.yml` montado em `/data/publicacao`
- [x] 2.2 Propagar envs no container `creator-engine-api`
- [x] 2.3 Atualizar `docs/VPS-ROMULOHUB.md` com rota de publicação e volume

## 3. API — mídia

- [x] 3.1 `POST /api/publicacao/posts/[id]/midia` — upload multipart + opção `copyFrom` para piloto
- [x] 3.2 `GET /api/publicacao/media/[postId]` — servir arquivo com validação `?token=`
- [x] 3.3 Testes unitários: auth token, mapeamento contentType, geração de URL

## 4. API — fila e callbacks n8n

- [x] 4.1 `GET /api/publicacao/fila` — posts elegíveis (AGENDADO, PRONTA, data vencida, Instagram, RN-04)
- [x] 4.2 `GET /api/publicacao/posts/[id]` — detalhe para payload Zernio
- [x] 4.3 `POST /api/publicacao/posts/[id]/enviando` — lock `publicacaoStatus=ENVIANDO`
- [x] 4.4 `POST /api/publicacao/posts/[id]/confirmar` — PUBLICADO + metadados Zernio
- [x] 4.5 `POST /api/publicacao/posts/[id]/erro` — ERRO + mensagem, mantém AGENDADO
- [x] 4.6 Middleware/helper `assertPublishToken` reutilizado em todas as rotas (exceto media)

## 5. Piloto roteiro 523

- [x] 5.1 Script `scripts/publicacao/register-pilot-523.mjs` — copia `523-hoje-tambem-teve/512/v1.jpg`, seta `publicacaoTipo=STORY`, `PRONTA`, `AGENDADO`, `dataPublicacao=now()`, `contaId` Instagram
- [x] 5.2 Smoke test local: `GET /api/publicacao/fila` retorna post 523 com `mediaUrl` acessível
- [x] 5.3 Deploy na VPS + executar script piloto + validar `curl -I` na mediaUrl

## 6. Workflow n8n (fora do repo — seguir spec)

- [x] 6.1 Criar credencial `N8N_PUBLISH_TOKEN` no n8n (HTTP Header Auth)
- [x] 6.2 Configurar env `ZERNIO_INSTAGRAM_ACCOUNT_ID` no n8n
- [x] 6.3 Implementar workflow manual "Instagram Story — Piloto 523" conforme `specs/workflow-n8n-publicacao-instagram/spec.md`
- [x] 6.4 Executar piloto: story live + post 523 `PUBLICADO` no CE
- [x] 6.5 Implementar workflow cron "Instagram Publicação — Produção" (5 min) após piloto OK

## 7. Verificação

- [x] 7.1 `npm test` — testes de `publicacao.ts` e rotas
- [x] 7.2 `npm run build` sem erros TypeScript
- [x] 7.3 Documentar checklist operacional no final de `design.md` ou README de `scripts/publicacao/`
