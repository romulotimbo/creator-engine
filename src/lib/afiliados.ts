import { z } from "zod"

export const PLATAFORMA_ADS_LABELS: Record<string, string> = {
  META: "Meta Ads",
  GOOGLE: "Google Ads",
  TIKTOK_ADS: "TikTok Ads",
  OUTRO: "Outro",
}

export const STATUS_CONTA_TRAFEGO_LABELS: Record<string, string> = {
  ATIVA: "Ativa",
  PAUSADA: "Pausada",
  ARQUIVADA: "Arquivada",
}

export const TIPO_CONTA_VINCULADA_LABELS: Record<string, string> = {
  BRAIP: "Braip",
  MONETIZZE: "Monetizze",
  HOTMART: "Hotmart",
  EMAIL: "E-mail",
  PROXY: "Proxy",
  PIXEL: "Pixel",
  OUTRO: "Outro",
}

export const PLATAFORMA_AFILIADO_LABELS: Record<string, string> = {
  BRAIP: "Braip",
  MONETIZZE: "Monetizze",
  HOTMART: "Hotmart",
  EDUZZ: "Eduzz",
  OUTRO: "Outro",
}

export const STATUS_VENDA_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  CANCELADA: "Cancelada",
  ESTORNADA: "Estornada",
}

export const STATUS_PRODUTO_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  ARQUIVADO: "Arquivado",
}

export const STATUS_DECISAO_LABELS: Record<string, string> = {
  GARIMPO: "Garimpo",
  ANALISE: "Em Análise",
  APROVADO_TESTE: "Aprovado para Teste",
  EM_EXECUCAO: "Em Execução",
  PAUSADO: "Pausado",
  DESCARTADO: "Descartado",
}

export const COMPLETUDE_DADOS_LABELS: Record<string, string> = {
  COMPLETO: "Dados Completos",
  PARCIAL: "Dados Parciais (Sem Ads)",
  INCOMPLETO: "Dados Incompletos",
}

const plataformaAds = z.enum(["META", "GOOGLE", "TIKTOK_ADS", "OUTRO"])
const statusConta = z.enum(["ATIVA", "PAUSADA", "ARQUIVADA"])
const tipoVinculada = z.enum(["BRAIP", "MONETIZZE", "HOTMART", "EMAIL", "PROXY", "PIXEL", "OUTRO"])
const statusVinculada = z.enum(["ATIVA", "PAUSADA", "INATIVA"])
const plataformaAfil = z.enum(["BRAIP", "MONETIZZE", "HOTMART", "EDUZZ", "OUTRO"])
const statusProduto = z.enum(["ATIVO", "PAUSADO", "ARQUIVADO"])
const statusVenda = z.enum(["PENDENTE", "APROVADA", "CANCELADA", "ESTORNADA"])
export const statusDecisaoEnum = z.enum(["GARIMPO", "ANALISE", "APROVADO_TESTE", "EM_EXECUCAO", "PAUSADO", "DESCARTADO"])
export const completudeDadosEnum = z.enum(["COMPLETO", "PARCIAL", "INCOMPLETO"])

export const discoverySourceEnum = z.enum([
  "search_from",
  "network_direct",
  "glimpse",
  "keyword_planner",
  "indicacao",
  "outro",
])

export const DISCOVERY_SOURCE_LABELS: Record<string, string> = {
  search_from: "Search (from)",
  network_direct: "Direto da Rede",
  glimpse: "Glimpse",
  keyword_planner: "Keyword Planner",
  indicacao: "Indicação",
  outro: "Outro",
}

export const reputationStatusEnum = z.enum(["ok", "flagged", "burned"])

export const REPUTATION_STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  flagged: "Sinalizado",
  burned: "Queimado",
}


export const contaTrafegoCreateSchema = z.object({
  slug: z.string().min(2).max(50),
  nome: z.string().min(1),
  plataforma: plataformaAds.default("META"),
  status: statusConta.default("ATIVA"),
  observacoes: z.string().optional().nullable(),
  metaGasto: z.coerce.number().nonnegative().optional().nullable(),
  metaRoas: z.coerce.number().nonnegative().optional().nullable(),
})

export const contaTrafegoUpdateSchema = contaTrafegoCreateSchema.partial().omit({ slug: true }).extend({
  slug: z.string().min(2).max(50).optional(),
})

export const contaVinculadaSchema = z.object({
  tipo: tipoVinculada,
  handle: z.string().min(1),
  status: statusVinculada.default("ATIVA"),
  notas: z.string().optional().nullable(),
})

export const produtoAfiliadoSchema = z.object({
  slug: z.string().min(2).max(50),
  nome: z.string().min(1),
  plataformaAfil: plataformaAfil,
  preco: z.coerce.number().nonnegative().optional().nullable(),
  comissaoPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  linkCheckout: z.string().optional().nullable(),
  linkLanding: z.string().optional().nullable(),
  status: statusProduto.default("ATIVO"),
  observacoes: z.string().optional().nullable(),
})

export const produtoUpdateSchema = produtoAfiliadoSchema.partial()

export const vinculoProdutoSchema = z.object({
  produtoId: z.string().min(1),
  linkTracking: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
})

export const vinculoProdutoUpdateSchema = z.object({
  linkTracking: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
})

export const vendaAfiliadoSchema = z.object({
  contaTrafegoId: z.string().min(1),
  produtoId: z.string().optional().nullable(),
  data: z.coerce.date(),
  valorVenda: z.coerce.number().nonnegative(),
  valorComissao: z.coerce.number(),
  plataformaAfil: plataformaAfil,
  status: statusVenda.default("PENDENTE"),
  externalId: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
})

export const vendaUpdateSchema = vendaAfiliadoSchema.partial().omit({ contaTrafegoId: true })

export const ofertaDecisaoSchema = z.object({
  nome: z.string().min(1, "Nome da oferta é obrigatório"),
  plataformas: z.array(z.string()).default([]),
  vertical: z.string().optional().nullable(),
  geoPrioritario: z.string().optional().nullable(),
  geosPermitidos: z.array(z.string()).default([]),

  visitasTotais: z.coerce.number().int().nonnegative().optional().nullable(),
  tendenciaTrafego30d: z.coerce.number().optional().nullable(),
  tendenciaTrafego60d: z.coerce.number().optional().nullable(),
  tendenciaTrafego90d: z.coerce.number().optional().nullable(),
  statusTendencia: z.string().optional().nullable(),
  comissaoValor: z.coerce.number().nonnegative().optional().nullable(),
  epcRede: z.coerce.number().nonnegative().optional().nullable(),
  cvrRede: z.coerce.number().nonnegative().optional().nullable(),
  refundPct: z.coerce.number().min(0).max(100).optional().nullable(),
  bounceRate: z.coerce.number().min(0).max(100).optional().nullable(),
  cbGravity: z.coerce.number().optional().nullable(),
  cbScore: z.coerce.number().optional().nullable(),

  cpcMinimo: z.coerce.number().nonnegative().optional().nullable(),
  cpcMaximo: z.coerce.number().nonnegative().optional().nullable(),
  cpcMedioEsperado: z.coerce.number().nonnegative().optional().nullable(),
  volumeBuscaMensal: z.coerce.number().int().nonnegative().optional().nullable(),
  brandBiddingPermitido: z.boolean().default(true),
  keywordsPrioritarias: z.array(z.string()).default([]),

  statusDecisao: statusDecisaoEnum.default("GARIMPO"),
  budgetTesteAlocado: z.coerce.number().nonnegative().optional().nullable(),
  cpaAlvoBreakeven: z.coerce.number().nonnegative().optional().nullable(),
  observacoes: z.string().optional().nullable(),

  // Governança — Rede, Revisão, Domínio, Termos, Descoberta
  networkId: z.string().optional().nullable(),
  nextReviewAt: z.coerce.date().optional().nullable(),
  domainUsed: z.string().optional().nullable(),
  termsVerifiedAt: z.coerce.date().optional().nullable(),
  discoverySource: discoverySourceEnum.optional().nullable(),
})

export const ofertaDecisaoUpdateSchema = ofertaDecisaoSchema.partial()

export const networkCreateSchema = z.object({
  nome: z.string().min(1, "Nome da rede é obrigatório"),
  paymentReliabilityScore: z.coerce.number().int().min(0).max(100).optional().nullable(),
  prazoPagamentoDias: z.coerce.number().int().nonnegative().optional().nullable(),
  notas: z.string().optional().nullable(),
})

export const networkUpdateSchema = networkCreateSchema.partial()

export const portfolioConfigSchema = z.object({
  totalAvailableCapital: z.coerce.number().nonnegative(),
  currency: z.string().min(1).default("USD"),
})

export const termsVersionCreateSchema = z.object({
  hasChanged: z.boolean().default(false),
  termsUrl: z.string().optional().nullable(),
  changesSummary: z.string().optional().nullable(),
  capturedBy: z.string().optional().nullable(),
})

export function decimalNum(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0
  return Number(v)
}

