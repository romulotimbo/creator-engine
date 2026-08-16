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

export const PLATAFORMA_AFILIADO_VALUES = [
  "BRAIP",
  "MONETIZZE",
  "HOTMART",
  "EDUZZ",
  "CLICKBANK",
  "BUYGOODS",
  "MAXWEB",
  "GROWMEDIA",
  "MEDIASCALERS",
  "GURUMEDIA",
  "DIGISTORE24",
  "SMARTADV",
  "CARTPANDA",
  "ADCOMBO",
  "OUTRO",
] as const

export type PlataformaAfiliadoValue = (typeof PLATAFORMA_AFILIADO_VALUES)[number]

export const PLATAFORMA_AFILIADO_LABELS: Record<string, string> = {
  BRAIP: "Braip",
  MONETIZZE: "Monetizze",
  HOTMART: "Hotmart",
  EDUZZ: "Eduzz",
  CLICKBANK: "ClickBank",
  BUYGOODS: "BuyGoods",
  MAXWEB: "MaxWeb",
  GROWMEDIA: "GrowMedia",
  MEDIASCALERS: "MediaScalers",
  GURUMEDIA: "GuruMedia",
  DIGISTORE24: "Digistore24",
  SMARTADV: "SmartAdv",
  CARTPANDA: "CartPanda",
  ADCOMBO: "AdCombo",
  OUTRO: "Outro",
} satisfies Record<PlataformaAfiliadoValue, string>

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
const plataformaAfil = z.enum(PLATAFORMA_AFILIADO_VALUES)
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

export const conversionPointEnum = z.enum(["SALE", "VALID_CC_SUBMIT", "LEAD", "CALL"])
export const tipoProdutoAfiliadoEnum = z.enum(["NUTRACEUTICO_TRIAL", "ECOM", "INFOPRODUTO", "SERVICO"])
export const saturacaoAfiliadosEnum = z.enum(["BAIXA", "MEDIA", "ALTA", "DESCONHECIDA"])
export const estrategiaCampanhaEnum = z.enum(["REVIEW_BOTTOM_FUNNEL", "GENERIC_TOP_FUNNEL", "BRANDED_BIDDING"])
export const statusOperacionalEnum = z.enum(["TESTANDO", "ESCALANDO", "PAUSADO", "ENCERRADO"])
export const papelContaAdsEnum = z.enum(["PRINCIPAL", "CONTINGENCIA"])

export const CONVERSION_POINT_LABELS: Record<string, string> = {
  SALE: "Sale",
  VALID_CC_SUBMIT: "Valid CC Submit (trial/rebill)",
  LEAD: "Lead",
  CALL: "Call",
}

export const TIPO_PRODUTO_AFILIADO_LABELS: Record<string, string> = {
  NUTRACEUTICO_TRIAL: "Nutracêutico / trial",
  ECOM: "E-com",
  INFOPRODUTO: "Infoproduto",
  SERVICO: "Serviço",
}

export const SATURACAO_AFILIADOS_LABELS: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  DESCONHECIDA: "Desconhecida",
}

export const ESTRATEGIA_CAMPANHA_LABELS: Record<string, string> = {
  REVIEW_BOTTOM_FUNNEL: "Review bottom-funnel",
  GENERIC_TOP_FUNNEL: "Generic top-funnel",
  BRANDED_BIDDING: "Branded bidding",
}

export const STATUS_OPERACIONAL_LABELS: Record<string, string> = {
  TESTANDO: "Testando",
  ESCALANDO: "Escalando",
  PAUSADO: "Pausado",
  ENCERRADO: "Encerrado",
}

export const PAPEL_CONTA_ADS_LABELS: Record<string, string> = {
  PRINCIPAL: "Principal",
  CONTINGENCIA: "Contingência",
}

const periodoRegex = /^\d{4}-(0[1-9]|1[0-2])$/


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

export const PRODUTO_SLUG_MAX = 120

const optionalLongUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().max(2048).nullable().optional(),
)

export const produtoAfiliadoSchema = z.object({
  slug: z.string().min(2).max(PRODUTO_SLUG_MAX),
  nome: z.string().min(1),
  plataformaAfil: plataformaAfil,
  preco: z.coerce.number().nonnegative().optional().nullable(),
  comissaoPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  linkCheckout: optionalLongUrl,
  linkLanding: optionalLongUrl,
  status: statusProduto.default("ATIVO"),
  observacoes: z.string().optional().nullable(),
  conversionPoint: conversionPointEnum.optional().nullable(),
  tipoProduto: tipoProdutoAfiliadoEnum.optional().nullable(),
  ltvEstimadoRebill: z.coerce.number().nonnegative().optional().nullable(),
  comissaoValor: z.coerce.number().nonnegative().optional().nullable(),
  budgetTesteAlocado: z.coerce.number().nonnegative().optional().nullable(),
  cpaAlvoBreakeven: z.coerce.number().nonnegative().optional().nullable(),
  cpaAlvoManual: z.boolean().optional(),
  margemDesejadaPct: z.coerce.number().positive().optional().nullable(),
  criterioPausa: z.string().optional().nullable(),
  criterioEscala: z.string().optional().nullable(),
  statusOperacional: statusOperacionalEnum.optional().nullable(),
  dataInicioTeste: z.coerce.date().optional().nullable(),
  domainUsed: z.string().optional().nullable(),
  nextReviewAt: z.coerce.date().optional().nullable(),
  moeda: z.string().optional().nullable(),
})

const produtoRollupFields = [
  "gastoTotalAcumulado",
  "receitaConfirmadaAcumulada",
  "roiReal",
  "cpaReal",
  "dataUltimaAtualizacaoDados",
  "scoreOrigem",
] as const

export const produtoUpdateSchema = produtoAfiliadoSchema.partial().strip().transform((data) => {
  const stripped = { ...data }
  for (const key of produtoRollupFields) {
    delete (stripped as Record<string, unknown>)[key]
  }
  return stripped
})

export const campanhaCreateSchema = z.object({
  nomeCampanhaGoogleAds: z.string().min(1, "Nome da campanha no Google Ads é obrigatório"),
  contaTrafegoId: z.string().optional().nullable(),
  nomeContaAds: z.string().optional().nullable(),
  geo: z.string().optional().nullable(),
  estrategia: estrategiaCampanhaEnum.optional().nullable(),
  papelConta: papelContaAdsEnum.default("PRINCIPAL"),
  dataInicio: z.coerce.date().optional().nullable(),
  dataFim: z.coerce.date().optional().nullable(),
  status: statusOperacionalEnum.default("TESTANDO"),
  budgetDiarioDefinido: z.coerce.number().nonnegative().optional().nullable(),
  budgetTesteAlocado: z.coerce.number().nonnegative().optional().nullable(),
  linkPainelGoogleAds: z.string().optional().nullable(),
  moeda: z.string().optional().nullable(),
})

export const campanhaUpdateSchema = campanhaCreateSchema.partial()

export const campanhaGastoSnapshotSchema = z.object({
  dataSnapshot: z.coerce.date().optional(),
  gasto: z.coerce.number().nonnegative(),
})

export const campanhaSnapshotRowSchema = z.object({
  nomeCampanhaGoogleAds: z.string().min(1),
  dataSnapshot: z.coerce.date().optional(),
  gasto: z.coerce.number().nonnegative().optional().nullable(),
  impressoes: z.coerce.number().int().nonnegative().optional().nullable(),
  cliques: z.coerce.number().int().nonnegative().optional().nullable(),
  ctr: z.coerce.number().optional().nullable(),
  conversoes: z.coerce.number().nonnegative().optional().nullable(),
  cvr: z.coerce.number().optional().nullable(),
  cpcMedio: z.coerce.number().nonnegative().optional().nullable(),
  cpaReal: z.coerce.number().nonnegative().optional().nullable(),
  receitaConfirmada: z.coerce.number().nonnegative().optional().nullable(),
  roiReal: z.coerce.number().optional().nullable(),
})

export const orcamentoPeriodoSchema = z.object({
  periodo: z.string().regex(periodoRegex, "Período deve ser YYYY-MM"),
  capitalTotalDisponivel: z.coerce.number().nonnegative(),
  moedaBase: z.string().min(1).default("USD"),
  limitePctPorProduto: z.coerce.number().min(0).max(100).optional().nullable(),
  reservaMinimaPct: z.coerce.number().min(0).max(100).default(0),
})

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

  conversionPoint: conversionPointEnum.optional().nullable(),
  tipoProduto: tipoProdutoAfiliadoEnum.optional().nullable(),
  ltvEstimadoRebill: z.coerce.number().nonnegative().optional().nullable(),
  saturacaoAfiliados: saturacaoAfiliadosEnum.optional().nullable(),
  criterioPausa: z.string().optional().nullable(),
  criterioEscala: z.string().optional().nullable(),
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

