-- Publicação Instagram via n8n/Zernio — campos em Post.
-- Idempotente: rodar manualmente em banco EXISTENTE.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/08-publicacao-instagram.sql
--
-- Em dev, `prisma db push` já cria estes objetos.

SET search_path TO creator_engine;

DO $$ BEGIN
  CREATE TYPE "PublicacaoStatus" AS ENUM ('SEM_MIDIA', 'PRONTA', 'ENVIANDO', 'PUBLICADA', 'ERRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PublicacaoTipo" AS ENUM ('STORY', 'REEL', 'FEED', 'CARROSSEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "publicacaoStatus" "PublicacaoStatus" NOT NULL DEFAULT 'SEM_MIDIA';
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "publicacaoTipo" "PublicacaoTipo";
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "midiaPath" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "midiaMime" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "midiaToken" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "zernioPostId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "platformPostUrl" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "publicacaoErro" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "publicacaoEnviadaEm" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Post_publicacaoStatus_status_dataPublicacao_idx"
  ON "Post" ("publicacaoStatus", "status", "dataPublicacao");
