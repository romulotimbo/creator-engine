-- (Opcional) Mover credenciais de infra que estão vinculadas a uma persona para escopo global.
-- Revise antes de rodar: SELECT id, chave, categoria, "personaId", global FROM creator_engine."Credencial";
--
-- docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/07-promote-persona-infra-creds.sql

UPDATE creator_engine."Credencial"
SET global = true, "personaId" = NULL
WHERE "personaId" IS NOT NULL
  AND categoria IN ('runpod', 'comfyui', 'midjourney', 'dolphin', 'api');
