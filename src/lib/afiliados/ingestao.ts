import { z } from "zod"
import { assertTokenFromEnv } from "@/lib/publicacao"

export const INGEST_TOKEN_HEADER = "X-Ingest-Token"
export const INGEST_TOKEN_ENV = "AFILIADOS_INGEST_TOKEN"

/** Token dedicado do endpoint de ingestão — distinto de N8N_PUBLISH_TOKEN (D1). */
export function assertIngestToken(req: Request) {
  return assertTokenFromEnv(req, INGEST_TOKEN_ENV, INGEST_TOKEN_HEADER)
}

/**
 * Contrato de ingestão agnóstico de fonte (afiliados-ingestao).
 * Envelope único: {fonte, tipo, periodo, linhas[], campanhasCobertas[]}, ou a
 * variante de falha {fonte, tipo, status: "FALHA", erro} sem linhas[].
 */

export const tipoIngestaoEnum = z.enum(["CAMPANHA_DIARIO", "SEGMENTO", "SERIE_TERMO"])
export type TipoIngestao = z.infer<typeof tipoIngestaoEnum>

export const dimensaoSegmentoEnum = z.enum(["GEO", "DISPOSITIVO"])
export const fonteTermoEnum = z.enum([
  "GOOGLE_KEYWORD_PLANNER",
  "BING",
  "GLIMPSE",
  "SEMRUSH",
  "FLOWSPY",
  "MANUAL",
])
export const unidadeSerieTermoEnum = z.enum(["ABSOLUTO", "IMPRESSOES", "INDICE_0_100"])

const periodoSchema = z.object({
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
})

const campanhaCobertaSchema = z.object({
  googleAdsCustomerId: z.string().min(1),
  nomeCampanhaGoogleAds: z.string().min(1),
})
export type CampanhaCoberta = z.infer<typeof campanhaCobertaSchema>

export const linhaCampanhaDiarioSchema = z.object({
  googleAdsCustomerId: z.string().min(1),
  nomeCampanhaGoogleAds: z.string().min(1),
  dataSnapshot: z.coerce.date(),
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
  checkoutsCount: z.coerce.number().int().nonnegative().optional().nullable(),
})
export type LinhaCampanhaDiario = z.infer<typeof linhaCampanhaDiarioSchema>

export const linhaSegmentoSchema = z.object({
  googleAdsCustomerId: z.string().min(1),
  nomeCampanhaGoogleAds: z.string().min(1),
  dimensao: dimensaoSegmentoEnum,
  valor: z.string().min(1),
  data: z.coerce.date(),
  gasto: z.coerce.number().nonnegative().optional().nullable(),
  cliques: z.coerce.number().int().nonnegative().optional().nullable(),
  conversoes: z.coerce.number().nonnegative().optional().nullable(),
  cpaReal: z.coerce.number().nonnegative().optional().nullable(),
})
export type LinhaSegmento = z.infer<typeof linhaSegmentoSchema>

export const linhaSerieTermoSchema = z.object({
  termoId: z.string().min(1),
  geo: z.string().min(1),
  fonte: fonteTermoEnum,
  data: z.coerce.date(),
  valor: z.coerce.number().optional().nullable(),
  unidade: unidadeSerieTermoEnum,
})
export type LinhaSerieTermo = z.infer<typeof linhaSerieTermoSchema>

const envelopeBase = {
  fonte: z.string().min(1),
  periodo: periodoSchema,
}

export const envelopeCampanhaDiarioSchema = z.object({
  ...envelopeBase,
  tipo: z.literal("CAMPANHA_DIARIO"),
  campanhasCobertas: z.array(campanhaCobertaSchema).default([]),
  linhas: z.array(linhaCampanhaDiarioSchema).default([]),
})

export const envelopeSegmentoSchema = z.object({
  ...envelopeBase,
  tipo: z.literal("SEGMENTO"),
  campanhasCobertas: z.array(campanhaCobertaSchema).default([]),
  linhas: z.array(linhaSegmentoSchema).default([]),
})

export const envelopeSerieTermoSchema = z.object({
  ...envelopeBase,
  tipo: z.literal("SERIE_TERMO"),
  linhas: z.array(linhaSerieTermoSchema).default([]),
})

/** Payload alternativo: fonte reporta que tentou coletar e falhou, sem linhas[]. */
export const envelopeFalhaSchema = z.object({
  fonte: z.string().min(1),
  tipo: tipoIngestaoEnum,
  status: z.literal("FALHA"),
  erro: z.string().min(1),
})

export type EnvelopeCampanhaDiario = z.infer<typeof envelopeCampanhaDiarioSchema>
export type EnvelopeSegmento = z.infer<typeof envelopeSegmentoSchema>
export type EnvelopeSerieTermo = z.infer<typeof envelopeSerieTermoSchema>
export type EnvelopeFalha = z.infer<typeof envelopeFalhaSchema>
export type EnvelopeSucesso = EnvelopeCampanhaDiario | EnvelopeSegmento | EnvelopeSerieTermo
export type Envelope = EnvelopeFalha | EnvelopeSucesso

export type ParseEnvelopeResult =
  | { ok: true; envelope: Envelope }
  | { ok: false; error: string }

/**
 * Despacha o corpo bruto do endpoint de ingestão por `tipo`/`status`, sem rota
 * separada por grão (D1). Falha SEMPRE é checada primeiro — um envelope de
 * falha não deve ser mal-interpretado como sucesso com zero linhas.
 */
export function parseIngestaoEnvelope(body: unknown): ParseEnvelopeResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Corpo inválido" }
  }
  const record = body as Record<string, unknown>

  if (record.status === "FALHA") {
    const parsed = envelopeFalhaSchema.safeParse(body)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Envelope de falha inválido" }
    }
    return { ok: true, envelope: parsed.data }
  }

  const tipo = tipoIngestaoEnum.safeParse(record.tipo)
  if (!tipo.success) {
    return { ok: false, error: "tipo deve ser CAMPANHA_DIARIO, SEGMENTO ou SERIE_TERMO" }
  }

  const schema =
    tipo.data === "CAMPANHA_DIARIO"
      ? envelopeCampanhaDiarioSchema
      : tipo.data === "SEGMENTO"
        ? envelopeSegmentoSchema
        : envelopeSerieTermoSchema

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Envelope inválido" }
  }
  return { ok: true, envelope: parsed.data }
}
