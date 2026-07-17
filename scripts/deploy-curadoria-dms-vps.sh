#!/usr/bin/env bash
# Deploy curadoria-dms + setup Postgres na VPS
set -euo pipefail

CE_DIR="/srv/data/creator-engine-api"
cd "$CE_DIR"

echo "==> Verificar tabela instagram_dm_responses"
docker exec postgres psql -U romulo_db_user -d personal_db -c \
  "SELECT status, COUNT(*) FROM public.instagram_dm_responses GROUP BY status ORDER BY 1;" || true

echo "==> Gerar senha ce_dm_curator (se necessário)"
GRANTS_FILE="$CE_DIR/prisma/sql/09-curadoria-dms-grants.sql"
if ! docker exec postgres psql -U romulo_db_user -d personal_db -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname='ce_dm_curator'" | grep -q 1; then
  CE_DM_PASSWORD="$(openssl rand -hex 16)"
  sed "s/TROQUE_ESTA_SENHA/${CE_DM_PASSWORD}/" "$GRANTS_FILE" | \
    docker exec -i postgres psql -U romulo_db_user -d personal_db
  echo "ce_dm_curator criado."
else
  echo "ce_dm_curator já existe — reutilizando senha do .env se presente."
  CE_DM_PASSWORD="$(grep -E '^N8N_POSTGRES_URL=' .env | sed -n 's/.*ce_dm_curator:\([^@]*\)@.*/\1/p')"
  if [[ -z "${CE_DM_PASSWORD:-}" ]]; then
    CE_DM_PASSWORD="$(openssl rand -hex 16)"
    docker exec postgres psql -U romulo_db_user -d personal_db \
      -c "ALTER ROLE ce_dm_curator PASSWORD '${CE_DM_PASSWORD}';"
    echo "Senha ce_dm_curator rotacionada."
  fi
fi

N8N_POSTGRES_URL="postgresql://ce_dm_curator:${CE_DM_PASSWORD}@postgres:5432/personal_db"

echo "==> Atualizar .env com N8N_POSTGRES_URL"
if grep -q '^N8N_POSTGRES_URL=' .env; then
  sed -i "s|^N8N_POSTGRES_URL=.*|N8N_POSTGRES_URL=${N8N_POSTGRES_URL}|" .env
else
  echo "N8N_POSTGRES_URL=${N8N_POSTGRES_URL}" >> .env
fi

echo "==> Garantir N8N_POSTGRES_URL no docker-compose.prod.yml"
if ! grep -q 'N8N_POSTGRES_URL' docker-compose.prod.yml; then
  echo "AVISO: N8N_POSTGRES_URL ausente no compose — adicione manualmente."
fi

echo "==> Deploy app"
bash scripts/deploy-vps.sh

echo "==> Smoke curadoria-dms (interno)"
docker exec creator-engine-api node -e "
fetch('http://localhost:3000/creator-engine/api/curadoria-dms?limit=1')
  .then(r => r.json().then(j => console.log('status', r.status, JSON.stringify(j).slice(0,200))))
  .catch(e => { console.error(e); process.exit(1); });
" || echo "Smoke interno falhou (auth pode exigir sessão)"

echo "==> Deploy curadoria-dms concluído"
echo "URL: https://romulohub.cloud/creator-engine/curadoria-dms"
