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

const plataformaAds = z.enum(["META", "GOOGLE", "TIKTOK_ADS", "OUTRO"])
const statusConta = z.enum(["ATIVA", "PAUSADA", "ARQUIVADA"])
const tipoVinculada = z.enum(["BRAIP", "MONETIZZE", "HOTMART", "EMAIL", "PROXY", "PIXEL", "OUTRO"])
const statusVinculada = z.enum(["ATIVA", "PAUSADA", "INATIVA"])
const plataformaAfil = z.enum(["BRAIP", "MONETIZZE", "HOTMART", "EDUZZ", "OUTRO"])
const statusProduto = z.enum(["ATIVO", "PAUSADO", "ARQUIVADO"])
const statusVenda = z.enum(["PENDENTE", "APROVADA", "CANCELADA", "ESTORNADA"])

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

export function decimalNum(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0
  return Number(v)
}
