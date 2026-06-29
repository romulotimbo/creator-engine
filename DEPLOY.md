# Deploy — Creator Engine (VPS romulohub.cloud)

Container `creator-engine-api` (Next.js standalone) atrás do Traefik, sob o
subpath `https://romulohub.cloud/creator-engine/`, usando o Postgres existente
(database `personal_db`, schema `creator_engine`).

Pré-requisitos no VPS: Docker + Compose, Traefik já rodando, container `postgres`
acessível pela rede interna.

---

## 1. Secrets — adicionar 2 linhas ao `.env` da compose

O `DATABASE_URL`, `NEXTAUTH_URL` etc. são montados no próprio YAML
(`environment:` do serviço `creator-engine-api`), reaproveitando o
`${POSTGRES_PASSWORD}` que já existe. Só falta **adicionar 2 segredos** ao
mesmo `.env` que já contém `POSTGRES_PASSWORD` (o ao lado da compose):

```env
# já existe:
# POSTGRES_PASSWORD=...
# adicionar:
AUTH_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -hex 32>    # ⚠️ gere UMA vez e faça BACKUP (perder = credenciais irrecuperáveis)
```

```bash
openssl rand -base64 32   # → AUTH_SECRET
openssl rand -hex 32      # → ENCRYPTION_KEY
```

## 2. Banco — criar o schema (rodar uma vez no Postgres existente)

```bash
# cria o schema creator_engine; idempotente
psql -U romulo_db_user -d personal_db -f prisma/sql/00-init-schemas.sql
```

> GRANTs do hermes NÃO são necessários: o hermes-agent conecta com o próprio
> `romulo_db_user`, que é o owner do schema creator_engine (acesso total).
> O plano de ataque será reconstruído dentro da app — sem migração de dados agora.

## 3. Aplicar o schema da app (db push) — via imagem builder

O container de runtime é mínimo (sem o Prisma CLI). Use o estágio `builder`,
que tem todas as deps + schema, para rodar o `db push`:

```bash
docker build --target builder -t creator-engine-build .
# substitua SENHA pela POSTGRES_PASSWORD real (visível no editor do painel)
docker run --rm --network creator-internal \
  -e DATABASE_URL="postgresql://romulo_db_user:SENHA@postgres:5432/personal_db?schema=creator_engine" \
  creator-engine-build npx prisma db push
```

## 4. Usuário admin (seed)

```bash
docker run --rm --network creator-internal \
  -e DATABASE_URL="postgresql://romulo_db_user:SENHA@postgres:5432/personal_db?schema=creator_engine" \
  creator-engine-build npm run db:seed
# cria admin@creator-engine.local / creatorengine123 + persona de exemplo veesemfiltro
```

> Troque a senha do admin depois. A persona de exemplo **veesemfiltro** vai para prod.
> O seed cria apenas a persona + contas (não os 521 posts/ferramentas/métricas).

### 4b. (Opcional) Migrar os DADOS atuais da veesemfiltro (dev → prod)

Para levar tudo que existe em dev (521 posts, ferramentas, métricas, financeiro),
faça um dump do schema `creator_engine` do banco de dev e restaure em prod.
**Não rode o seed (passo 4) se for por aqui** — o dump já traz admin + dados.

```bash
# 1) no ambiente de DEV (banco em docker creator-engine-postgres-dev):
docker exec creator-engine-postgres-dev \
  pg_dump -U romulo_db_user -d personal_db \
  --schema=creator_engine --no-owner --no-privileges --clean --if-exists \
  > ce-veesemfiltro.sql

# 2) transfira ce-veesemfiltro.sql para o VPS e restaure:
psql -U romulo_db_user -d personal_db -f ce-veesemfiltro.sql
```

> O dump inclui dados de amostra `[amostra]` (financeiro/métricas de exemplo).
> Para removê-los em prod:
> ```sql
> DELETE FROM creator_engine."MetricaHistorica";
> DELETE FROM creator_engine."Receita" WHERE descricao='[amostra]';
> DELETE FROM creator_engine."Custo"   WHERE descricao='[amostra]';
> ```

## 5. Build + subir o app

```bash
# ajuste os nomes de rede/certresolver no docker-compose.prod.yml (TODOs)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f creator-engine-api
```

## 6. Verificação

```bash
curl -I https://romulohub.cloud/creator-engine/login         # 200
curl -s https://romulohub.cloud/creator-engine/api/auth/csrf # JSON (não 500 — trustHost ok)
```

Login em `https://romulohub.cloud/creator-engine/login`.

---

## Atualizações futuras

**Antes de push/deploy (local):**

```bash
bash scripts/smoke-local.sh          # build + npm test
RUN_E2E=1 bash scripts/smoke-local.sh   # + Playwright (Postgres dev + seed)
```

E2E smoke exige banco com seed (`admin@creator-engine.local` / `creatorengine123`):

```bash
docker compose -f docker-compose.dev.yml up -d
npm run db:push && npm run db:seed
E2E_SMOKE=1 npm run test:e2e
```

**Migrations manuais** (se `db push` falhar):

```bash
docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/03-credencial-ferramenta-id.sql
docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/04-credencial-servico.sql
```

**Recomendado** — script que evita cache stale e garante `db push`:

```bash
cd /srv/data/creator-engine-api
git pull
bash scripts/deploy-vps.sh
```

Manual (equivalente):

```bash
cd /srv/data/creator-engine-api
git pull

# .env fica AO LADO da compose (não em /srv/data/.env)
# Se não souber o path: ls -la .env ../.env
# Ou leia do container postgres:
export POSTGRES_PASSWORD="$(docker exec postgres printenv POSTGRES_PASSWORD)"

docker build --no-cache --target builder -t creator-engine-build .
docker run --rm --network creator-internal \
  -e DATABASE_URL="postgresql://romulo_db_user:${POSTGRES_PASSWORD}@postgres:5432/personal_db?schema=creator_engine" \
  creator-engine-build npx prisma db push

docker compose -f docker-compose.prod.yml build --no-cache creator-engine-api
docker compose -f docker-compose.prod.yml up -d --force-recreate creator-engine-api
```

---

## Troubleshooting — versão “fragmentada” ou 404/500

### Sintoma: módulos antigos e novos misturados

**Causas comuns no VPS:**

1. **`db push` não rodou** — tabelas novas (`plano_ataque_item`, TOTP, módulos CE) não existem; páginas novas quebram no servidor.
2. **Build Docker com cache** — `docker compose up --build` reutilizou camadas antigas (`CACHED [builder 5/7] COPY . .`) e a imagem ficou desatualizada.
3. **Cache do browser** — chunks `_next/static` antigos misturados com HTML novo → hard refresh (`Ctrl+Shift+R`).

### Sintoma: `/plano-de-ataque` retorna erro

Nos logs você verá:

```
The table `creator_engine.plano_ataque_item` does not exist
```

**Fix:** rodar `db push` com senha correta (ver script acima). O `source /srv/data/.env` falha se o `.env` não estiver nesse path — use `.env` na pasta da compose ou `docker exec postgres printenv POSTGRES_PASSWORD`.

### Verificar containers duplicados

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E 'creator|streamlit'
```

Deve existir **apenas um** `creator-engine-api` na porta 3000. Pare containers antigos (ex.: Streamlit) se ainda estiverem no Traefik.

### Verificar tabelas no banco

```bash
docker exec -it postgres psql -U romulo_db_user -d personal_db -c "\dt creator_engine.*"
```

Deve listar `plano_ataque_item` e demais tabelas do schema.

### Auth.js `env-url-basepath-mismatch`

Garanta no compose: `NEXTAUTH_URL` e `AUTH_URL` = `https://romulohub.cloud/creator-engine` (com subpath).

## Checklist de produção

- [ ] `AUTH_SECRET` + `ENCRYPTION_KEY` adicionados ao `.env` da compose; `ENCRYPTION_KEY` com backup
- [ ] schema `creator_engine` criado (00-init-schemas.sql) — grants do hermes NÃO necessários (usa romulo_db_user)
- [ ] `db push` aplicado (20+ tabelas)
- [ ] admin semeado e senha trocada
- [ ] Traefik: porta 3000, SEM StripPrefix, rede traefik-proxy
- [ ] `/login` 200 e `/api/auth/csrf` sem 500
