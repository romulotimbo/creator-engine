-- Afiliados / Conta de Tráfego — hub operacional de ads + produtos afiliados.
-- Idempotente: rodar em banco EXISTENTE.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/11-afiliados-conta-trafego.sql
-- Em dev, `prisma db push` já cria estes objetos.

SET search_path TO creator_engine;

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PlataformaAds" AS ENUM ('META', 'GOOGLE', 'TIKTOK_ADS', 'OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusContaTrafego" AS ENUM ('ATIVA', 'PAUSADA', 'ARQUIVADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoContaVinculadaTrafego" AS ENUM ('BRAIP', 'MONETIZZE', 'HOTMART', 'EMAIL', 'PROXY', 'PIXEL', 'OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusContaVinculadaTrafego" AS ENUM ('ATIVA', 'PAUSADA', 'INATIVA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PlataformaAfiliado" AS ENUM ('BRAIP', 'MONETIZZE', 'HOTMART', 'EDUZZ', 'OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusProdutoAfiliado" AS ENUM ('ATIVO', 'PAUSADO', 'ARQUIVADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusVendaAfiliado" AS ENUM ('PENDENTE', 'APROVADA', 'CANCELADA', 'ESTORNADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrigemVendaAfiliado" AS ENUM ('MANUAL', 'WEBHOOK', 'IMPORT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabelas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ContaTrafego" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plataforma" "PlataformaAds" NOT NULL DEFAULT 'META',
    "status" "StatusContaTrafego" NOT NULL DEFAULT 'ATIVA',
    "observacoes" TEXT,
    "metaGasto" DECIMAL(12,2),
    "metaRoas" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContaTrafego_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ContaVinculadaTrafego" (
    "id" TEXT NOT NULL,
    "contaTrafegoId" TEXT NOT NULL,
    "tipo" "TipoContaVinculadaTrafego" NOT NULL,
    "handle" TEXT NOT NULL,
    "status" "StatusContaVinculadaTrafego" NOT NULL DEFAULT 'ATIVA',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContaVinculadaTrafego_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProdutoAfiliado" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plataformaAfil" "PlataformaAfiliado" NOT NULL,
    "preco" DECIMAL(10,2),
    "comissaoPercent" DECIMAL(5,2),
    "linkCheckout" TEXT,
    "linkLanding" TEXT,
    "status" "StatusProdutoAfiliado" NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProdutoAfiliado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ContaTrafegoProduto" (
    "id" TEXT NOT NULL,
    "contaTrafegoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "linkTracking" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContaTrafegoProduto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VendaAfiliado" (
    "id" TEXT NOT NULL,
    "contaTrafegoId" TEXT NOT NULL,
    "produtoId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "valorVenda" DECIMAL(12,2) NOT NULL,
    "valorComissao" DECIMAL(12,2) NOT NULL,
    "plataformaAfil" "PlataformaAfiliado" NOT NULL,
    "status" "StatusVendaAfiliado" NOT NULL DEFAULT 'PENDENTE',
    "origem" "OrigemVendaAfiliado" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendaAfiliado_pkey" PRIMARY KEY ("id")
);

-- Credencial.contaTrafegoId (terceiro escopo)
ALTER TABLE "Credencial" ADD COLUMN IF NOT EXISTS "contaTrafegoId" TEXT;

-- ── Índices / uniques ────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "ContaTrafego_slug_key" ON "ContaTrafego"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "ProdutoAfiliado_slug_key" ON "ProdutoAfiliado"("slug");
CREATE INDEX IF NOT EXISTS "ContaVinculadaTrafego_contaTrafegoId_idx" ON "ContaVinculadaTrafego"("contaTrafegoId");
CREATE UNIQUE INDEX IF NOT EXISTS "ContaVinculadaTrafego_contaTrafegoId_tipo_handle_key"
  ON "ContaVinculadaTrafego"("contaTrafegoId", "tipo", "handle");
CREATE INDEX IF NOT EXISTS "ContaTrafegoProduto_contaTrafegoId_idx" ON "ContaTrafegoProduto"("contaTrafegoId");
CREATE INDEX IF NOT EXISTS "ContaTrafegoProduto_produtoId_idx" ON "ContaTrafegoProduto"("produtoId");
CREATE UNIQUE INDEX IF NOT EXISTS "ContaTrafegoProduto_contaTrafegoId_produtoId_key"
  ON "ContaTrafegoProduto"("contaTrafegoId", "produtoId");
CREATE INDEX IF NOT EXISTS "VendaAfiliado_contaTrafegoId_data_idx" ON "VendaAfiliado"("contaTrafegoId", "data");
CREATE INDEX IF NOT EXISTS "VendaAfiliado_status_idx" ON "VendaAfiliado"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "VendaAfiliado_plataformaAfil_externalId_key"
  ON "VendaAfiliado"("plataformaAfil", "externalId");
CREATE INDEX IF NOT EXISTS "Credencial_contaTrafegoId_idx" ON "Credencial"("contaTrafegoId");

-- ── FKs ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "ContaVinculadaTrafego" ADD CONSTRAINT "ContaVinculadaTrafego_contaTrafegoId_fkey"
    FOREIGN KEY ("contaTrafegoId") REFERENCES "ContaTrafego"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ContaTrafegoProduto" ADD CONSTRAINT "ContaTrafegoProduto_contaTrafegoId_fkey"
    FOREIGN KEY ("contaTrafegoId") REFERENCES "ContaTrafego"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ContaTrafegoProduto" ADD CONSTRAINT "ContaTrafegoProduto_produtoId_fkey"
    FOREIGN KEY ("produtoId") REFERENCES "ProdutoAfiliado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "VendaAfiliado" ADD CONSTRAINT "VendaAfiliado_contaTrafegoId_fkey"
    FOREIGN KEY ("contaTrafegoId") REFERENCES "ContaTrafego"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "VendaAfiliado" ADD CONSTRAINT "VendaAfiliado_produtoId_fkey"
    FOREIGN KEY ("produtoId") REFERENCES "ProdutoAfiliado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Credencial" ADD CONSTRAINT "Credencial_contaTrafegoId_fkey"
    FOREIGN KEY ("contaTrafegoId") REFERENCES "ContaTrafego"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
