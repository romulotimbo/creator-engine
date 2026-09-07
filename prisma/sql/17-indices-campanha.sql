-- Índices de campanha — identidade + linha temporal append-only.
-- Idempotente: rodar em banco EXISTENTE.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/17-indices-campanha.sql
-- Em dev, `prisma db push` já cria estes objetos.
-- Ver openspec/changes/afiliados-indices-campanha/design.md.

SET search_path TO creator_engine;

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TipoIndiceCampanha" AS ENUM ('PALAVRA_CHAVE', 'DISPOSITIVO', 'LOCAL', 'PUBLICO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CorrespondenciaKeyword" AS ENUM ('EXATA', 'FRASE', 'AMPLA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusIndiceCampanha" AS ENUM ('ATIVO', 'PAUSADO', 'EXCLUIDO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrigemLinhaIndice" AS ENUM ('MANUAL', 'COLETA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabelas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "IndiceCampanha" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "tipo" "TipoIndiceCampanha" NOT NULL,
    "chave" TEXT NOT NULL,
    "correspondencia" "CorrespondenciaKeyword",
    "correspondenciaKey" TEXT NOT NULL DEFAULT '',
    "validadoVisualmente" BOOLEAN NOT NULL DEFAULT false,
    "negativado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndiceCampanha_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IndiceCampanhaLinha" (
    "id" TEXT NOT NULL,
    "indiceId" TEXT NOT NULL,
    "capturadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" "OrigemLinhaIndice" NOT NULL DEFAULT 'MANUAL',
    "status" "StatusIndiceCampanha" NOT NULL DEFAULT 'ATIVO',
    "ajusteLancePct" DECIMAL(8,2) NOT NULL,
    "cpc" DECIMAL(10,4),
    "cliques" INTEGER,
    "impressoes" INTEGER,
    "vendasConversao" DECIMAL(14,2),
    "custoConversao" DECIMAL(14,2),
    "roi" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndiceCampanhaLinha_pkey" PRIMARY KEY ("id")
);

-- Unique natural = (campanhaId, tipo, chave, COALESCE(correspondencia, ''))
-- via correspondenciaKey (cast de enum no índice não é IMMUTABLE no Postgres).
CREATE UNIQUE INDEX IF NOT EXISTS "IndiceCampanha_natural_key"
  ON "IndiceCampanha"("campanhaId", "tipo", "chave", "correspondenciaKey");

CREATE INDEX IF NOT EXISTS "IndiceCampanha_campanhaId_tipo_idx"
  ON "IndiceCampanha"("campanhaId", "tipo");

CREATE INDEX IF NOT EXISTS "IndiceCampanhaLinha_indiceId_capturadaEm_idx"
  ON "IndiceCampanhaLinha"("indiceId", "capturadaEm");

DO $$ BEGIN
  ALTER TABLE "IndiceCampanha" ADD CONSTRAINT "IndiceCampanha_campanhaId_fkey"
    FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IndiceCampanhaLinha" ADD CONSTRAINT "IndiceCampanhaLinha_indiceId_fkey"
    FOREIGN KEY ("indiceId") REFERENCES "IndiceCampanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Backfill: trio de dispositivos em campanhas existentes ───────────────────
INSERT INTO "IndiceCampanha" (
  "id", "campanhaId", "tipo", "chave", "correspondencia", "correspondenciaKey",
  "validadoVisualmente", "negativado", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  c."id",
  'DISPOSITIVO',
  d.chave,
  NULL,
  '',
  false,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Campanha" c
CROSS JOIN (VALUES ('SMARTPHONE'), ('TABLET'), ('COMPUTADOR')) AS d(chave)
WHERE NOT EXISTS (
  SELECT 1 FROM "IndiceCampanha" i
  WHERE i."campanhaId" = c."id"
    AND i."tipo" = 'DISPOSITIVO'
    AND i."chave" = d.chave
    AND i."correspondenciaKey" = ''
);

INSERT INTO "IndiceCampanhaLinha" (
  "id", "indiceId", "capturadaEm", "origem", "status", "ajusteLancePct",
  "cpc", "cliques", "impressoes", "vendasConversao", "custoConversao", "roi", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  i."id",
  CURRENT_TIMESTAMP,
  'MANUAL',
  'ATIVO',
  0,
  NULL, NULL, NULL, NULL, NULL, NULL,
  CURRENT_TIMESTAMP
FROM "IndiceCampanha" i
WHERE i."tipo" = 'DISPOSITIVO'
  AND NOT EXISTS (
    SELECT 1 FROM "IndiceCampanhaLinha" l WHERE l."indiceId" = i."id"
  );
