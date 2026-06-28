#!/usr/bin/env bash
# Deploy Creator Engine no VPS (romulohub.cloud)
# Uso: cd /srv/data/creator-engine-api && bash scripts/deploy-vps.sh
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICE="${SERVICE:-creator-engine-api}"

echo "==> 1/5 git pull"
git pull

echo "==> 2/5 Resolver POSTGRES_PASSWORD"
if [[ -f .env ]]; then
  set -a && source .env && set +a
elif [[ -f ../.env ]]; then
  set -a && source ../.env && set +a
fi
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  POSTGRES_PASSWORD="$(docker exec postgres printenv POSTGRES_PASSWORD 2>/dev/null || true)"
fi
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "ERRO: POSTGRES_PASSWORD não encontrado (.env ao lado da compose ou container postgres)."
  exit 1
fi
export DATABASE_URL="postgresql://romulo_db_user:${POSTGRES_PASSWORD}@postgres:5432/personal_db?schema=creator_engine"

echo "==> 3/5 Build builder + db push"
docker build --no-cache --target builder -t creator-engine-build .
docker run --rm --network creator-internal \
  -e DATABASE_URL="$DATABASE_URL" \
  creator-engine-build npx prisma db push

echo "==> 4/5 Rebuild app (sem cache) + recreate"
docker compose -f "$COMPOSE_FILE" build --no-cache "$SERVICE"
docker compose -f "$COMPOSE_FILE" up -d --force-recreate "$SERVICE"

echo "==> 5/5 Verificação"
docker compose -f "$COMPOSE_FILE" ps
docker compose -f "$COMPOSE_FILE" logs "$SERVICE" --tail 20
bash scripts/verify-prod.sh || true
curl -sI "https://romulohub.cloud/creator-engine/login" | head -3 || true
echo
echo "Deploy concluído."
echo "  • Hard refresh no browser: Ctrl+Shift+R (ou aba anônima)"
echo "  • Se verify-prod mostrar 200 interno e 404 externo → revisar Traefik"
