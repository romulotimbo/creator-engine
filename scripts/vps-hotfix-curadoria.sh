#!/usr/bin/env bash
set -euo pipefail
cd /srv/data/creator-engine-api
tar xzf /tmp/curadoria-fix.tgz -C .
rm -f src/components/curadoria-dms/CuradoriaDmEditModal.tsx
docker exec -i n8n-postgres psql -U n8n_user -d n8n -c "GRANT SELECT ON TABLE public.instagram_dm_messages TO ce_dm_curator;" 2>/dev/null || true
set -a && source .env && set +a
export DATABASE_URL="postgresql://romulo_db_user:${POSTGRES_PASSWORD}@postgres:5432/personal_db?schema=creator_engine"
docker build --no-cache --target builder -t creator-engine-build .
docker compose -f docker-compose.prod.yml build --no-cache creator-engine-api
docker compose -f docker-compose.prod.yml up -d --force-recreate creator-engine-api
echo FIX_DEPLOYED
