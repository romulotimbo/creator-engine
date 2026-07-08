#!/usr/bin/env bash
# Correção do split-brain de Postgres no VPS (romulohub.cloud) — 2026-07-05
#
# Contexto: dois containers Postgres (postgres + compose-postgres-1) rodavam
# com o MESMO alias DNS "postgres" na rede creator-internal e o MESMO datadir
# /srv/data/postgres-data → dados divergentes ("somem e reaparecem") e risco
# de corrupção. Este script consolida tudo num único Postgres com datadir novo
# e restaura o dump consolidado (fusão validada dos dois lados).
#
# Pré-requisito: /srv/data/backups-split-brain/merged-personal_db-vps-20260705.sql
# (já enviado; md5 4b353ea0487f2aefa45d9c061554c756)
#
# Uso (da sua máquina):  ssh romulohub 'bash -s' < scripts/fix-split-brain-vps.sh
# Downtime esperado: ~2-5 min. NADA é apagado: datadir antigo vira quarentena.
set -euo pipefail

STAMP=20260705
DUMP=/srv/data/backups-split-brain/merged-personal_db-vps-${STAMP}.sql

echo "== pré-checagens =="
test -f "$DUMP" || { echo "ERRO: dump não encontrado: $DUMP"; exit 1; }
echo "4b353ea0487f2aefa45d9c061554c756  $DUMP" | md5sum -c -

echo "[1/8] corrigindo init-db.sql (bind-mount virou diretório vazio)"
if [ -d /srv/data/creator-engine-api/init-db.sql ]; then
  rmdir /srv/data/creator-engine-api/init-db.sql
  cp /srv/data/compose/init-db.sql /srv/data/creator-engine-api/init-db.sql
fi

echo "[2/8] parando apps (cessa gravações)"
docker stop creator-engine-api landing-api

echo "[3/8] parando os dois postgres"
docker stop postgres compose-postgres-1

echo "[4/8] quarentena do datadir split-brain (forense — nada apagado)"
mv /srv/data/postgres-data /srv/data/postgres-data-SPLITBRAIN-${STAMP}

echo "[5/8] removendo container antigo e desativando compose obsoleto"
docker rm compose-postgres-1
mv /srv/data/compose/docker-compose.creator.yml \
   /srv/data/compose/docker-compose.creator.yml.DESATIVADO-${STAMP}

echo "[6/8] recriando postgres único (datadir novo — init-db.sql roda)"
cd /srv/data/creator-engine-api
docker compose -f docker-compose.prod.yml up -d --force-recreate postgres
for i in $(seq 1 45); do
  docker exec postgres pg_isready -U romulo_db_user -d personal_db >/dev/null 2>&1 && break
  sleep 2
done
docker exec postgres pg_isready -U romulo_db_user -d personal_db

echo "[7/8] restaurando dump consolidado em personal_db"
docker exec -i postgres psql -U romulo_db_user -d personal_db -v ON_ERROR_STOP=0 -q \
  < "$DUMP" 2>&1 | grep -E "ERROR" | sort | uniq -c | head -10 || true

echo "== verificação dos dados =="
docker exec postgres psql -U romulo_db_user -d personal_db -t -c "
  SELECT 'Ferramenta (esperado 6)   ', count(*) FROM creator_engine.\"Ferramenta\"
  UNION ALL SELECT 'Post (esperado 521)       ', count(*) FROM creator_engine.\"Post\"
  UNION ALL SELECT 'Credencial (esperado 8)   ', count(*) FROM creator_engine.\"Credencial\"
  UNION ALL SELECT 'Persona (esperado 1)      ', count(*) FROM creator_engine.\"Persona\"
  UNION ALL SELECT 'waitlist (esperado 3)     ', count(*) FROM landing.vault_waitlist"

echo "[8/8] religando apps"
docker start creator-engine-api landing-api
sleep 25
docker ps --format '{{.Names}} | {{.Status}}' | grep -E 'creator|landing|postgres'

echo "== sanidade DNS: alias 'postgres' deve resolver para UM único IP =="
docker run --rm --network creator-internal alpine sh -c "nslookup postgres 2>/dev/null | tail -3" || true

echo "CONCLUÍDO — confira o app em https://romulohub.cloud/creator-engine/"
