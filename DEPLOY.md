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

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
# se o schema.prisma mudou, rode o passo 3 (db push) antes/depois conforme a mudança
```

## Checklist de produção

- [ ] `AUTH_SECRET` + `ENCRYPTION_KEY` adicionados ao `.env` da compose; `ENCRYPTION_KEY` com backup
- [ ] schema `creator_engine` criado (00-init-schemas.sql) — grants do hermes NÃO necessários (usa romulo_db_user)
- [ ] `db push` aplicado (20+ tabelas)
- [ ] admin semeado e senha trocada
- [ ] Traefik: porta 3000, SEM StripPrefix, rede traefik-proxy
- [ ] `/login` 200 e `/api/auth/csrf` sem 500
