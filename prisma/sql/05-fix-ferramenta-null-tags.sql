-- Corrige tags NULL em Ferramenta (Prisma exige String[] não-nulo)
-- docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/05-fix-ferramenta-null-tags.sql

UPDATE creator_engine."Ferramenta"
SET tags = ARRAY[]::text[]
WHERE tags IS NULL;
