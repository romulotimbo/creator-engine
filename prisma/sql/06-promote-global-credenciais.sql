-- Credenciais de infra sem persona (personaId null) → global=true
-- Antes da UI de credenciais globais, registros ficavam com global=false.
-- docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/06-promote-global-credenciais.sql

UPDATE creator_engine."Credencial"
SET global = true
WHERE "personaId" IS NULL
  AND global = false;
