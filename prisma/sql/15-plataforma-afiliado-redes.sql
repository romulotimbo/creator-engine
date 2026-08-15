-- Novas redes no enum PlataformaAfiliado (catálogo / vendas).
-- Idempotente: rodar em banco EXISTENTE (CREATE TYPE do 11 já passou).
--   psql -U romulo_db_user -d personal_db -f prisma/sql/15-plataforma-afiliado-redes.sql
-- Em dev, `prisma db push` já adiciona os valores.

SET search_path TO creator_engine;

ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'CLICKBANK';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'BUYGOODS';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'MAXWEB';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'GROWMEDIA';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'MEDIASCALERS';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'GURUMEDIA';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'DIGISTORE24';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'SMARTADV';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'CARTPANDA';
ALTER TYPE "PlataformaAfiliado" ADD VALUE IF NOT EXISTS 'ADCOMBO';
