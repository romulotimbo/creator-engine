#!/usr/bin/env bash
set -euo pipefail
CE=/srv/data/creator-engine-api
cd "$CE"

echo "==> Extrair arquivos"
tar xzf /tmp/curadoria-deploy.tgz -C "$CE"
mkdir -p "$CE/src/app/api" "$CE/src/app/(dashboard)" "$CE/src/components"
tar xzf /tmp/curadoria-deploy2.tgz -C "$CE/src"

echo "==> Verificar instagram_dm_responses (n8n-postgres)"
docker exec n8n-postgres psql -U n8n_user -d n8n -c \
  "SELECT status, COUNT(*)::int AS n FROM public.instagram_dm_responses GROUP BY status ORDER BY 1;"

echo "==> Setup ce_dm_curator no n8n-postgres"
if docker exec n8n-postgres psql -U n8n_user -d n8n -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname='ce_dm_curator'" | grep -q 1; then
  if grep -q '^N8N_POSTGRES_URL=' .env; then
    CE_DM_PASSWORD=$(grep '^N8N_POSTGRES_URL=' .env | sed -n 's|.*ce_dm_curator:\([^@]*\)@.*|\1|p')
    echo "Reutilizando senha existente no .env"
  else
    CE_DM_PASSWORD=$(openssl rand -hex 16)
    docker exec n8n-postgres psql -U n8n_user -d n8n \
      -c "ALTER ROLE ce_dm_curator PASSWORD '${CE_DM_PASSWORD}';"
  fi
else
  CE_DM_PASSWORD=$(openssl rand -hex 16)
  docker exec n8n-postgres psql -U n8n_user -d n8n <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ce_dm_curator') THEN
    CREATE ROLE ce_dm_curator LOGIN PASSWORD '${CE_DM_PASSWORD}';
  END IF;
END \$\$;
GRANT CONNECT ON DATABASE n8n TO ce_dm_curator;
GRANT USAGE ON SCHEMA public TO ce_dm_curator;
GRANT SELECT ON TABLE public.instagram_dm_responses TO ce_dm_curator;
GRANT UPDATE (final_text, status, reviewed_at, updated_at)
  ON TABLE public.instagram_dm_responses TO ce_dm_curator;
SQL
fi

N8N_POSTGRES_URL="postgresql://ce_dm_curator:${CE_DM_PASSWORD}@n8n-postgres:5432/n8n"
if grep -q '^N8N_POSTGRES_URL=' .env; then
  sed -i "s|^N8N_POSTGRES_URL=.*|N8N_POSTGRES_URL=${N8N_POSTGRES_URL}|" .env
else
  echo "N8N_POSTGRES_URL=${N8N_POSTGRES_URL}" >> .env
fi

echo "==> Conectar creator-engine-api à rede n8n_n8n-net"
docker network connect n8n_n8n-net creator-engine-api 2>/dev/null || echo "já conectado"

echo "==> Testar conexão ce_dm_curator"
docker run --rm --network n8n_n8n-net \
  -e PGPASSWORD="${CE_DM_PASSWORD}" \
  pgvector/pgvector:pg16 \
  psql -h n8n-postgres -U ce_dm_curator -d n8n -c \
  "SELECT id, status FROM public.instagram_dm_responses WHERE status='pending_review' LIMIT 3;"

echo "==> Build + deploy"
set -a
source .env
set +a
export DATABASE_URL="postgresql://romulo_db_user:${POSTGRES_PASSWORD}@postgres:5432/personal_db?schema=creator_engine"

docker build --no-cache --target builder -t creator-engine-build .
docker run --rm --network creator-internal \
  -e DATABASE_URL="$DATABASE_URL" \
  creator-engine-build npx prisma db push

docker compose -f docker-compose.prod.yml build --no-cache creator-engine-api
docker compose -f docker-compose.prod.yml up -d --force-recreate creator-engine-api

docker network connect n8n_n8n-net creator-engine-api 2>/dev/null || true

sleep 12
docker compose -f docker-compose.prod.yml logs creator-engine-api --tail 25

echo "==> Smoke interno"
docker exec creator-engine-api node -e "
fetch('http://localhost:3000/creator-engine/api/curadoria-dms?limit=2')
  .then(async r => { const t = await r.text(); console.log('HTTP', r.status, t.slice(0,500)); })
  .catch(e => { console.error(e); process.exit(1); });
"

echo "DONE — https://romulohub.cloud/creator-engine/curadoria-dms"
