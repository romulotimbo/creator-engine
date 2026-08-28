-- Ciclo de teste e escala — ingestão agnóstica de fonte, VendaAfiliado como
-- fonte de verdade de ROI, fila de decisão codificada, regras de teste/
-- re-teste/escala/segmento sobre LimiarGlobal, Termo/SerieTermo (demanda).
-- Idempotente: rodar em banco EXISTENTE.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/16-ciclo-teste-escala.sql
-- Em dev, `prisma db push` já cria estes objetos.
-- Ver openspec/changes/afiliados-ciclo-teste-escala/design.md.

SET search_path TO creator_engine;

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TipoIngestao" AS ENUM ('CAMPANHA_DIARIO', 'SEGMENTO', 'SERIE_TERMO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusColeta" AS ENUM ('SUCESSO', 'FALHA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DimensaoSegmento" AS ENUM ('GEO', 'DISPOSITIVO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoBridge" AS ENUM ('TSL', 'VSL', 'ADVERTORIAL', 'QUIZ', 'REVIEW', 'DIRECT_LINK', 'OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MotivoEncerramento" AS ENUM ('FALHA_EXECUCAO', 'FALHA_MERCADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoAlvoFila" AS ENUM ('OFERTA', 'CAMPANHA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusItemFila" AS ENUM ('ABERTO', 'ADIADO', 'APLICADO', 'DISPENSADO', 'EXPIRADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PrioridadeFila" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrigemAjuste" AS ENUM ('FILA', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoAjuste" AS ENUM ('BUDGET', 'CPA_ALVO', 'LANCE_SEGMENTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusUploadAds" AS ENUM ('PENDENTE', 'ENVIADA', 'FORA_DA_JANELA', 'EXCLUIDA_REDE_NATIVA', 'RETRATADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adição aditiva caso o tipo já exista de uma aplicação anterior deste script sem RETRATADA.
ALTER TYPE "StatusUploadAds" ADD VALUE IF NOT EXISTS 'RETRATADA';

DO $$ BEGIN
  CREATE TYPE "FonteTermo" AS ENUM ('GOOGLE_KEYWORD_PLANNER', 'BING', 'GLIMPSE', 'SEMRUSH', 'FLOWSPY', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UnidadeSerieTermo" AS ENUM ('ABSOLUTO', 'IMPRESSOES', 'INDICE_0_100');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PerfilFolego" AS ENUM ('INICIAL', 'CAIXA_FORMADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Colunas novas em tabelas existentes ─────────────────────────────────────
ALTER TABLE "ContaTrafego" ADD COLUMN IF NOT EXISTS "googleAdsCustomerId" TEXT;

ALTER TABLE "CampanhaSnapshot" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CampanhaSnapshot" ADD COLUMN IF NOT EXISTS "checkoutsCount" INTEGER;

ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "linkBridge" TEXT;
ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "tipoBridge" "TipoBridge";
ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "bridgeObservacoes" TEXT;
ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "motivoEncerramento" "MotivoEncerramento";
ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "gastoTotalAcumulado" DECIMAL(14,2);
ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "receitaConfirmadaAcumulada" DECIMAL(14,2);
ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "roiReal" DECIMAL(10,4);
ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "cpaReal" DECIMAL(10,2);

ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "limiaresOverride" JSONB;

ALTER TABLE "VendaAfiliado" ADD COLUMN IF NOT EXISTS "campanhaId" TEXT;
ALTER TABLE "VendaAfiliado" ADD COLUMN IF NOT EXISTS "tipoIdentificador" TEXT;
ALTER TABLE "VendaAfiliado" ADD COLUMN IF NOT EXISTS "valorIdentificador" TEXT;
ALTER TABLE "VendaAfiliado" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "VendaAfiliado" ADD COLUMN IF NOT EXISTS "statusUploadAds" "StatusUploadAds" NOT NULL DEFAULT 'PENDENTE';

ALTER TABLE "PortfolioConfig" ADD COLUMN IF NOT EXISTS "perfilFolego" "PerfilFolego" NOT NULL DEFAULT 'INICIAL';

ALTER TABLE "Campanha" ADD COLUMN IF NOT EXISTS "campanhaOrigemId" TEXT;
CREATE INDEX IF NOT EXISTS "Campanha_campanhaOrigemId_idx" ON "Campanha"("campanhaOrigemId");
DO $$ BEGIN
  ALTER TABLE "Campanha" ADD CONSTRAINT "Campanha_campanhaOrigemId_fkey"
    FOREIGN KEY ("campanhaOrigemId") REFERENCES "Campanha"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabelas novas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CampanhaNaoReconciliada" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "tipo" "TipoIngestao" NOT NULL,
    "googleAdsCustomerId" TEXT,
    "nomeCampanhaGoogleAds" TEXT,
    "linhaBruta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" TIMESTAMP(3),
    "resolvidoCampanhaId" TEXT,
    CONSTRAINT "CampanhaNaoReconciliada_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RegistroColeta" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "tipo" "TipoIngestao" NOT NULL,
    "ultimaExecucaoEm" TIMESTAMP(3),
    "ultimoPeriodoCoberto" JSONB,
    "ultimoStatus" "StatusColeta",
    "ultimoErro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroColeta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LimiarGlobal" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LimiarGlobal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ItemFila" (
    "id" TEXT NOT NULL,
    "tipoAlvo" "TipoAlvoFila" NOT NULL,
    "alvoId" TEXT NOT NULL,
    "regra" TEXT NOT NULL,
    "prioridade" "PrioridadeFila" NOT NULL,
    "resumo" TEXT NOT NULL,
    "evidencia" JSONB,
    "status" "StatusItemFila" NOT NULL DEFAULT 'ABERTO',
    "resolvidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemFila_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SegmentoCampanhaSnapshot" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "dimensao" "DimensaoSegmento" NOT NULL,
    "valor" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "gasto" DECIMAL(14,2),
    "cliques" INTEGER,
    "conversoes" DECIMAL(10,2),
    "cpaReal" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SegmentoCampanhaSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AjusteCampanha" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "itemFilaId" TEXT,
    "origem" "OrigemAjuste" NOT NULL,
    "tipo" "TipoAjuste" NOT NULL,
    "valorAnterior" DECIMAL(14,4),
    "valorNovo" DECIMAL(14,4),
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AjusteCampanha_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampanhaStatusLog" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "statusAnterior" "StatusOperacional",
    "statusNovo" "StatusOperacional" NOT NULL,
    "motivo" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampanhaStatusLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Termo" (
    "id" TEXT NOT NULL,
    "termo" TEXT NOT NULL,
    "produtoId" TEXT,
    "ofertaDecisaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Termo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SerieTermo" (
    "id" TEXT NOT NULL,
    "termoId" TEXT NOT NULL,
    "geo" TEXT NOT NULL,
    "fonte" "FonteTermo" NOT NULL,
    "data" DATE NOT NULL,
    "valor" DECIMAL(14,4),
    "unidade" "UnidadeSerieTermo" NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SerieTermo_pkey" PRIMARY KEY ("id")
);

-- ── Índices / uniques ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "CampanhaNaoReconciliada_resolvidoEm_idx" ON "CampanhaNaoReconciliada"("resolvidoEm");
CREATE INDEX IF NOT EXISTS "CampanhaNaoReconciliada_fonte_tipo_idx" ON "CampanhaNaoReconciliada"("fonte", "tipo");

CREATE UNIQUE INDEX IF NOT EXISTS "RegistroColeta_fonte_tipo_key" ON "RegistroColeta"("fonte", "tipo");

CREATE UNIQUE INDEX IF NOT EXISTS "LimiarGlobal_chave_key" ON "LimiarGlobal"("chave");

CREATE INDEX IF NOT EXISTS "ItemFila_regra_tipoAlvo_alvoId_idx" ON "ItemFila"("regra", "tipoAlvo", "alvoId");
CREATE INDEX IF NOT EXISTS "ItemFila_status_prioridade_idx" ON "ItemFila"("status", "prioridade");

CREATE UNIQUE INDEX IF NOT EXISTS "SegmentoCampanhaSnapshot_campanhaId_dimensao_valor_data_key"
  ON "SegmentoCampanhaSnapshot"("campanhaId", "dimensao", "valor", "data");
CREATE INDEX IF NOT EXISTS "SegmentoCampanhaSnapshot_campanhaId_dimensao_data_idx"
  ON "SegmentoCampanhaSnapshot"("campanhaId", "dimensao", "data");

CREATE INDEX IF NOT EXISTS "AjusteCampanha_campanhaId_data_idx" ON "AjusteCampanha"("campanhaId", "data");
CREATE INDEX IF NOT EXISTS "AjusteCampanha_itemFilaId_idx" ON "AjusteCampanha"("itemFilaId");

CREATE INDEX IF NOT EXISTS "CampanhaStatusLog_campanhaId_data_idx" ON "CampanhaStatusLog"("campanhaId", "data");

CREATE INDEX IF NOT EXISTS "Termo_produtoId_idx" ON "Termo"("produtoId");
CREATE INDEX IF NOT EXISTS "Termo_ofertaDecisaoId_idx" ON "Termo"("ofertaDecisaoId");

CREATE UNIQUE INDEX IF NOT EXISTS "SerieTermo_termoId_geo_fonte_data_key" ON "SerieTermo"("termoId", "geo", "fonte", "data");
CREATE INDEX IF NOT EXISTS "SerieTermo_termoId_geo_data_idx" ON "SerieTermo"("termoId", "geo", "data");

CREATE INDEX IF NOT EXISTS "VendaAfiliado_campanhaId_idx" ON "VendaAfiliado"("campanhaId");

-- ── FKs ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "VendaAfiliado" ADD CONSTRAINT "VendaAfiliado_campanhaId_fkey"
    FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SegmentoCampanhaSnapshot" ADD CONSTRAINT "SegmentoCampanhaSnapshot_campanhaId_fkey"
    FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AjusteCampanha" ADD CONSTRAINT "AjusteCampanha_campanhaId_fkey"
    FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AjusteCampanha" ADD CONSTRAINT "AjusteCampanha_itemFilaId_fkey"
    FOREIGN KEY ("itemFilaId") REFERENCES "ItemFila"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampanhaStatusLog" ADD CONSTRAINT "CampanhaStatusLog_campanhaId_fkey"
    FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Termo" ADD CONSTRAINT "Termo_produtoId_fkey"
    FOREIGN KEY ("produtoId") REFERENCES "ProdutoAfiliado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Termo" ADD CONSTRAINT "Termo_ofertaDecisaoId_fkey"
    FOREIGN KEY ("ofertaDecisaoId") REFERENCES "OfertaDecisao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SerieTermo" ADD CONSTRAINT "SerieTermo_termoId_fkey"
    FOREIGN KEY ("termoId") REFERENCES "Termo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Termo pertence a OfertaDecisao OU ProdutoAfiliado, nunca os dois (nem nenhum) —
-- Prisma não expressa XOR de FK nativamente, então o CHECK vive só no SQL de prod.
DO $$ BEGIN
  ALTER TABLE "Termo" ADD CONSTRAINT "Termo_produtoId_ofertaDecisaoId_xor_check"
    CHECK (("produtoId" IS NULL) <> ("ofertaDecisaoId" IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
