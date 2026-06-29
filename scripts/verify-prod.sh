#!/usr/bin/env bash
# Diagnóstico Creator Engine em produção (rodar no VPS)
set -euo pipefail

BASE="${BASE:-http://localhost:3000/creator-engine}"
echo "=== Containers creator / porta 3000 ==="
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}' | grep -E 'creator|NAMES' || true
echo
echo "=== Imagem do creator-engine-api ==="
docker inspect creator-engine-api --format 'Image={{.Config.Image}} Created={{.Created}}' 2>/dev/null || echo "Container creator-engine-api não encontrado"
echo
echo "=== Labels Traefik (router creator-engine) ==="
docker inspect creator-engine-api --format '{{json .Config.Labels}}' 2>/dev/null | tr ',' '\n' | grep -i traefik || true
echo
echo "=== Rotas HTTP dentro do container (sem Traefik) ==="
for path in /login /plano-de-ataque /ferramentas /templates /analytics /personas /calendario; do
  code="$(docker exec creator-engine-api node -e "
    fetch('${BASE}${path}', { redirect: 'manual' })
      .then(r => console.log(r.status))
      .catch(() => console.log('ERR'))
  " 2>/dev/null || echo "ERR")"
  printf "  %-20s %s\n" "$path" "$code"
done
echo
echo "=== Chunk _next (amostra — deve ser 200) ==="
CHUNK="$(docker exec creator-engine-api sh -c 'ls .next/static/chunks/*.js 2>/dev/null | head -1' || true)"
if [[ -n "$CHUNK" ]]; then
  CHUNK_NAME="$(basename "$CHUNK")"
  docker exec creator-engine-api node -e "
    fetch('${BASE}/_next/static/chunks/${CHUNK_NAME}')
      .then(r => console.log('_next/static/chunks/${CHUNK_NAME}', r.status))
      .catch(() => console.log('ERR'))
  " 2>/dev/null || true
else
  echo "  Nenhum chunk encontrado em .next/static/chunks"
fi
echo
echo "=== Duplicatas (pare se houver mais de um creator-engine-api) ==="
docker ps -a --filter name=creator-engine --format '{{.Names}} {{.Status}} {{.Image}}'
echo
echo "=== Schema Credencial (ferramentaId, servico) ==="
docker exec postgres psql -U romulo_db_user -d personal_db -tAc \
  "SELECT column_name FROM information_schema.columns WHERE table_schema='creator_engine' AND table_name='Credencial' AND column_name IN ('ferramentaId','servico') ORDER BY 1;" 2>/dev/null || echo "  (postgres inacessível)"
echo
echo "=== API credenciais (sem auth → esperado 401, não 404) ==="
docker exec creator-engine-api node -e "
  fetch('${BASE}/api/credenciais', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    .then(r => console.log('POST /api/credenciais', r.status))
    .catch(() => console.log('ERR'))
" 2>/dev/null || true
echo
echo "=== Dica ==="
echo "  • 404 só fora do container → Traefik (StripPrefix duplicado ou router antigo)"
echo "  • 404 dentro do container → rebuild incompleto (git pull + deploy-vps.sh)"
echo "  • Layout antigo + sidebar com abreviações PA/CE → cache browser ou container velho"
