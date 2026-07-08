-- Estúdio de Vídeo — esteira de estilização (Remotion).
-- Idempotente: rodar manualmente em banco EXISTENTE (o init-db.sql só roda em
-- volume novo). Em dev, `prisma db push` já cria estes objetos.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/02-estudio-video.sql
--
-- Cross-schema: cria tudo no schema creator_engine (mesmo da app).

SET search_path TO creator_engine;

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "FormatoVideo" AS ENUM ('VERTICAL_9_16', 'QUADRADO_1_1', 'RETRATO_4_5');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusJobRender" AS ENUM ('FILA', 'RENDERIZANDO', 'POS', 'PRONTO', 'ERRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabelas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FonteVideo" (
    "id" TEXT NOT NULL,
    "personaId" TEXT,
    "arquivo" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "duracaoSeg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "largura" INTEGER NOT NULL DEFAULT 0,
    "altura" INTEGER NOT NULL DEFAULT 0,
    "fps" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "tamanhoBytes" BIGINT,
    "origem" TEXT NOT NULL DEFAULT 'scan',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FonteVideo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssetEstilizacao" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'imagem',
    "arquivo" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetEstilizacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TemplateVideo" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "composicao" TEXT NOT NULL,
    "formatos" "FormatoVideo"[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateVideo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RoteiroEstilizacao" (
    "id" TEXT NOT NULL,
    "personaId" TEXT,
    "nome" TEXT NOT NULL,
    "formato" "FormatoVideo" NOT NULL DEFAULT 'VERTICAL_9_16',
    "fonteVideoId" TEXT,
    "templateVideoId" TEXT,
    "timeline" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoteiroEstilizacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JobRender" (
    "id" TEXT NOT NULL,
    "roteiroId" TEXT NOT NULL,
    "fonteVideoId" TEXT,
    "templateVideoId" TEXT,
    "formato" "FormatoVideo" NOT NULL,
    "personaId" TEXT,
    "postId" TEXT,
    "status" "StatusJobRender" NOT NULL DEFAULT 'FILA',
    "outputPath" TEXT,
    "metadados" JSONB,
    "erro" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobRender_pkey" PRIMARY KEY ("id")
);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "FonteVideo_arquivo_key" ON "FonteVideo"("arquivo");
CREATE INDEX IF NOT EXISTS "FonteVideo_personaId_idx" ON "FonteVideo"("personaId");
CREATE UNIQUE INDEX IF NOT EXISTS "AssetEstilizacao_tag_key" ON "AssetEstilizacao"("tag");
CREATE UNIQUE INDEX IF NOT EXISTS "TemplateVideo_slug_key" ON "TemplateVideo"("slug");
CREATE INDEX IF NOT EXISTS "RoteiroEstilizacao_personaId_idx" ON "RoteiroEstilizacao"("personaId");
CREATE INDEX IF NOT EXISTS "JobRender_status_idx" ON "JobRender"("status");
CREATE INDEX IF NOT EXISTS "JobRender_personaId_idx" ON "JobRender"("personaId");

-- ── Foreign keys (dentro do próprio módulo; sem acoplar às tabelas existentes) ─
DO $$ BEGIN
  ALTER TABLE "RoteiroEstilizacao" ADD CONSTRAINT "RoteiroEstilizacao_fonteVideoId_fkey"
    FOREIGN KEY ("fonteVideoId") REFERENCES "FonteVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RoteiroEstilizacao" ADD CONSTRAINT "RoteiroEstilizacao_templateVideoId_fkey"
    FOREIGN KEY ("templateVideoId") REFERENCES "TemplateVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JobRender" ADD CONSTRAINT "JobRender_roteiroId_fkey"
    FOREIGN KEY ("roteiroId") REFERENCES "RoteiroEstilizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JobRender" ADD CONSTRAINT "JobRender_fonteVideoId_fkey"
    FOREIGN KEY ("fonteVideoId") REFERENCES "FonteVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JobRender" ADD CONSTRAINT "JobRender_templateVideoId_fkey"
    FOREIGN KEY ("templateVideoId") REFERENCES "TemplateVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
