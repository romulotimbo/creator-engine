-- Credencial.servico — nome do provedor/serviço (ex.: IPRoyal) em credenciais globais
-- docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/04-credencial-servico.sql

ALTER TABLE creator_engine."Credencial"
  ADD COLUMN IF NOT EXISTS "servico" TEXT;
