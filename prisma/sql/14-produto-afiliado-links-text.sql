-- Garante que URLs de LP/checkout em ProdutoAfiliado sejam TEXT (não VARCHAR curto).
-- Idempotente: rodar em banco EXISTENTE.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/14-produto-afiliado-links-text.sql
-- Em dev, `prisma db push` já aplica @db.Text nessas colunas.

SET search_path TO creator_engine;

DO $$ BEGIN
  ALTER TABLE "ProdutoAfiliado" ALTER COLUMN "linkCheckout" TYPE TEXT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProdutoAfiliado" ALTER COLUMN "linkLanding" TYPE TEXT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;
