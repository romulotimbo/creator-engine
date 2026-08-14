-- Campanha operacional, snapshots de performance e orçamento por período.
-- Idempotente: rodar em banco EXISTENTE.
--   psql -U romulo_db_user -d personal_db -f prisma/sql/13-campanha-orcamento.sql
-- Em dev, `prisma db push` já cria estes objetos.

SET search_path TO creator_engine;

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ConversionPoint" AS ENUM ('SALE', 'VALID_CC_SUBMIT', 'LEAD', 'CALL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoProdutoAfiliado" AS ENUM ('NUTRACEUTICO_TRIAL', 'ECOM', 'INFOPRODUTO', 'SERVICO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SaturacaoAfiliados" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'DESCONHECIDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EstrategiaCampanha" AS ENUM ('REVIEW_BOTTOM_FUNNEL', 'GENERIC_TOP_FUNNEL', 'BRANDED_BIDDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusOperacional" AS ENUM ('TESTANDO', 'ESCALANDO', 'PAUSADO', 'ENCERRADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PapelContaAds" AS ENUM ('PRINCIPAL', 'CONTINGENCIA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── OfertaDecisao: campos de análise ─────────────────────────────────────────
ALTER TABLE "OfertaDecisao" ADD COLUMN IF NOT EXISTS "conversionPoint" "ConversionPoint";
ALTER TABLE "OfertaDecisao" ADD COLUMN IF NOT EXISTS "tipoProduto" "TipoProdutoAfiliado";
ALTER TABLE "OfertaDecisao" ADD COLUMN IF NOT EXISTS "ltvEstimadoRebill" DECIMAL(10,2);
ALTER TABLE "OfertaDecisao" ADD COLUMN IF NOT EXISTS "saturacaoAfiliados" "SaturacaoAfiliados";
ALTER TABLE "OfertaDecisao" ADD COLUMN IF NOT EXISTS "criterioPausa" TEXT;
ALTER TABLE "OfertaDecisao" ADD COLUMN IF NOT EXISTS "criterioEscala" TEXT;

-- ── ProdutoAfiliado: operação + rollups ──────────────────────────────────────
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "conversionPoint" "ConversionPoint";
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "tipoProduto" "TipoProdutoAfiliado";
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "ltvEstimadoRebill" DECIMAL(10,2);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "scoreOrigem" DOUBLE PRECISION;
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "comissaoValor" DECIMAL(10,2);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "budgetTesteAlocado" DECIMAL(10,2);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "cpaAlvoBreakeven" DECIMAL(10,2);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "cpaAlvoManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "margemDesejadaPct" DECIMAL(6,2);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "criterioPausa" TEXT;
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "criterioEscala" TEXT;
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "statusOperacional" "StatusOperacional";
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "dataInicioTeste" TIMESTAMP(3);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "dataUltimaAtualizacaoDados" TIMESTAMP(3);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "domainUsed" TEXT;
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "nextReviewAt" TIMESTAMP(3);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "moeda" TEXT;
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "gastoTotalAcumulado" DECIMAL(14,2);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "receitaConfirmadaAcumulada" DECIMAL(14,2);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "roiReal" DECIMAL(10,4);
ALTER TABLE "ProdutoAfiliado" ADD COLUMN IF NOT EXISTS "cpaReal" DECIMAL(10,2);

-- ── Campanha ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Campanha" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "contaTrafegoId" TEXT,
    "nomeContaAds" TEXT,
    "nomeCampanhaGoogleAds" TEXT NOT NULL,
    "geo" TEXT,
    "estrategia" "EstrategiaCampanha",
    "papelConta" "PapelContaAds" NOT NULL DEFAULT 'PRINCIPAL',
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "status" "StatusOperacional" NOT NULL DEFAULT 'TESTANDO',
    "budgetDiarioDefinido" DECIMAL(10,2),
    "budgetTesteAlocado" DECIMAL(10,2),
    "linkPainelGoogleAds" TEXT,
    "dataUltimaAtualizacao" TIMESTAMP(3),
    "moeda" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campanha_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampanhaSnapshot" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "dataSnapshot" DATE NOT NULL,
    "gasto" DECIMAL(14,2),
    "impressoes" INTEGER,
    "cliques" INTEGER,
    "ctr" DECIMAL(8,4),
    "conversoes" DECIMAL(10,2),
    "cvr" DECIMAL(8,4),
    "cpcMedio" DECIMAL(10,4),
    "cpaReal" DECIMAL(10,2),
    "receitaConfirmada" DECIMAL(14,2),
    "roiReal" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampanhaSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrcamentoPeriodo" (
    "id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "capitalTotalDisponivel" DECIMAL(14,2) NOT NULL,
    "moedaBase" TEXT NOT NULL DEFAULT 'USD',
    "limitePctPorProduto" DECIMAL(5,2),
    "reservaMinimaPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrcamentoPeriodo_pkey" PRIMARY KEY ("id")
);

-- ── FKs / índices (idempotentes) ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "Campanha" ADD CONSTRAINT "Campanha_produtoId_fkey"
    FOREIGN KEY ("produtoId") REFERENCES "ProdutoAfiliado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Campanha" ADD CONSTRAINT "Campanha_contaTrafegoId_fkey"
    FOREIGN KEY ("contaTrafegoId") REFERENCES "ContaTrafego"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampanhaSnapshot" ADD CONSTRAINT "CampanhaSnapshot_campanhaId_fkey"
    FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CampanhaSnapshot_campanhaId_dataSnapshot_key"
  ON "CampanhaSnapshot"("campanhaId", "dataSnapshot");
CREATE INDEX IF NOT EXISTS "Campanha_produtoId_idx" ON "Campanha"("produtoId");
CREATE INDEX IF NOT EXISTS "Campanha_produtoId_nomeCampanhaGoogleAds_idx"
  ON "Campanha"("produtoId", "nomeCampanhaGoogleAds");
CREATE INDEX IF NOT EXISTS "CampanhaSnapshot_campanhaId_dataSnapshot_idx"
  ON "CampanhaSnapshot"("campanhaId", "dataSnapshot");
CREATE UNIQUE INDEX IF NOT EXISTS "OrcamentoPeriodo_periodo_key" ON "OrcamentoPeriodo"("periodo");
