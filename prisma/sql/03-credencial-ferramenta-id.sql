-- Credencial.ferramentaId — vínculo opcional credencial global → Ferramenta (CE-01)
-- Rodar manualmente em banco existente:
--   docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/03-credencial-ferramenta-id.sql
-- Ou: npx prisma db push (com DATABASE_URL apontando para creator_engine)

ALTER TABLE creator_engine."Credencial"
  ADD COLUMN IF NOT EXISTS "ferramentaId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Credencial_ferramentaId_fkey'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'creator_engine')
  ) THEN
    ALTER TABLE creator_engine."Credencial"
      ADD CONSTRAINT "Credencial_ferramentaId_fkey"
      FOREIGN KEY ("ferramentaId")
      REFERENCES creator_engine."Ferramenta"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Credencial_ferramentaId_idx"
  ON creator_engine."Credencial"("ferramentaId");
