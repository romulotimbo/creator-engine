-- Documento vivo da Campanha (texto puro, overwrite).
-- Idempotente: rodar em banco EXISTENTE.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/18-observacoes-campanha.sql
-- Em dev, `prisma db push` já cria esta coluna.
-- Distinto de "bridgeObservacoes" (LP) e de "ProdutoAfiliado.observacoes".

SET search_path TO creator_engine;

ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
