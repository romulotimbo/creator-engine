import { z } from "zod"
import { decimalNum } from "@/lib/afiliados"

export const tipoIndiceCampanhaEnum = z.enum(["PALAVRA_CHAVE", "DISPOSITIVO", "LOCAL", "PUBLICO"])
export const correspondenciaKeywordEnum = z.enum(["EXATA", "FRASE", "AMPLA"])
export const statusIndiceCampanhaEnum = z.enum(["ATIVO", "PAUSADO", "EXCLUIDO"])
export const origemLinhaIndiceEnum = z.enum(["MANUAL", "COLETA"])

export const TRIO_DISPOSITIVOS = ["SMARTPHONE", "TABLET", "COMPUTADOR"] as const
export type ChaveDispositivo = (typeof TRIO_DISPOSITIVOS)[number]

export const TIPO_INDICE_LABELS: Record<string, string> = {
  PALAVRA_CHAVE: "Palavra-chave",
  DISPOSITIVO: "Dispositivo",
  LOCAL: "Local",
  PUBLICO: "Público",
}

export const CORRESPONDENCIA_LABELS: Record<string, string> = {
  EXATA: "Exata",
  FRASE: "Frase",
  AMPLA: "Ampla",
}

export const STATUS_INDICE_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  EXCLUIDO: "Excluído",
}

export const CHAVE_DISPOSITIVO_LABELS: Record<ChaveDispositivo, string> = {
  SMARTPHONE: "Smartphone",
  TABLET: "Tablet",
  COMPUTADOR: "Computador",
}

const METRIC_KEYS = ["cpc", "cliques", "impressoes", "vendasConversao", "custoConversao", "roi"] as const
export type MetricaIndice = (typeof METRIC_KEYS)[number]

export type MetricasLinha = {
  cpc: number | null
  cliques: number | null
  impressoes: number | null
  vendasConversao: number | null
  custoConversao: number | null
  roi: number | null
}

const metricasSchema = z.object({
  cpc: z.coerce.number().nonnegative().optional().nullable(),
  cliques: z.coerce.number().int().nonnegative().optional().nullable(),
  impressoes: z.coerce.number().int().nonnegative().optional().nullable(),
  vendasConversao: z.coerce.number().nonnegative().optional().nullable(),
  custoConversao: z.coerce.number().nonnegative().optional().nullable(),
  roi: z.coerce.number().optional().nullable(),
})

export function correspondenciaKey(correspondencia: string | null | undefined): string {
  return correspondencia ?? ""
}

export function ehChaveDispositivo(chave: string): chave is ChaveDispositivo {
  return (TRIO_DISPOSITIVOS as readonly string[]).includes(chave)
}

export function normalizarIdentidade(input: {
  tipo: z.infer<typeof tipoIndiceCampanhaEnum>
  chave: string
  correspondencia?: string | null
}): {
  tipo: z.infer<typeof tipoIndiceCampanhaEnum>
  chave: string
  correspondencia: z.infer<typeof correspondenciaKeywordEnum> | null
  correspondenciaKey: string
} {
  const chave = input.chave.trim()
  if (!chave) {
    throw new z.ZodError([{ code: "custom", message: "chave é obrigatória", path: ["chave"] }])
  }

  if (input.tipo === "DISPOSITIVO") {
    if (!ehChaveDispositivo(chave)) {
      throw new z.ZodError([{
        code: "custom",
        message: "Dispositivo deve ser SMARTPHONE, TABLET ou COMPUTADOR",
        path: ["chave"],
      }])
    }
    return { tipo: input.tipo, chave, correspondencia: null, correspondenciaKey: "" }
  }

  if (input.tipo === "PALAVRA_CHAVE") {
    const parsed = correspondenciaKeywordEnum.safeParse(input.correspondencia)
    if (!parsed.success) {
      throw new z.ZodError([{
        code: "custom",
        message: "Palavra-chave exige correspondência EXATA, FRASE ou AMPLA",
        path: ["correspondencia"],
      }])
    }
    return {
      tipo: input.tipo,
      chave,
      correspondencia: parsed.data,
      correspondenciaKey: parsed.data,
    }
  }

  return { tipo: input.tipo, chave, correspondencia: null, correspondenciaKey: "" }
}

export const indiceCreateSchema = z.object({
  tipo: tipoIndiceCampanhaEnum,
  chave: z.string().trim().min(1, "chave é obrigatória"),
  correspondencia: correspondenciaKeywordEnum.optional().nullable(),
  validadoVisualmente: z.boolean().optional(),
  negativado: z.boolean().optional(),
  origem: origemLinhaIndiceEnum.default("MANUAL"),
  status: statusIndiceCampanhaEnum.default("ATIVO"),
  ajusteLancePct: z.coerce.number().default(0),
  capturadaEm: z.coerce.date().optional(),
}).and(metricasSchema).superRefine((data, ctx) => {
  try {
    normalizarIdentidade(data)
  } catch (e) {
    if (e instanceof z.ZodError) {
      for (const issue of e.issues) ctx.addIssue(issue)
    }
  }
})

export const indiceFlagsSchema = z.object({
  validadoVisualmente: z.boolean().optional(),
  negativado: z.boolean().optional(),
}).refine((o) => o.validadoVisualmente !== undefined || o.negativado !== undefined, {
  message: "Informe validadoVisualmente ou negativado",
})

export const indiceLinhaCreateSchema = z.object({
  origem: origemLinhaIndiceEnum.default("MANUAL"),
  status: statusIndiceCampanhaEnum,
  ajusteLancePct: z.coerce.number(),
  capturadaEm: z.coerce.date().optional(),
}).and(metricasSchema)

export type LinhaTemporal = {
  capturadaEm: Date
  createdAt: Date
}

export function vigenteDeLinhas<T extends LinhaTemporal>(linhas: T[]): T | null {
  if (linhas.length === 0) return null
  return [...linhas].sort((a, b) => {
    const byCaptura = b.capturadaEm.getTime() - a.capturadaEm.getTime()
    if (byCaptura !== 0) return byCaptura
    return b.createdAt.getTime() - a.createdAt.getTime()
  })[0]
}

export function resolverMetricasLinha(
  enviadas: Partial<Record<MetricaIndice, number | null | undefined>>,
  vigente: Partial<Record<MetricaIndice, number | null>> | null,
): MetricasLinha {
  const out = {} as MetricasLinha
  for (const k of METRIC_KEYS) {
    out[k] = enviadas[k] !== undefined ? enviadas[k] ?? null : (vigente?.[k] ?? null)
  }
  return out
}

export function payloadSeedDispositivos(agora = new Date()) {
  return TRIO_DISPOSITIVOS.map((chave) => ({
    tipo: "DISPOSITIVO" as const,
    chave,
    correspondencia: null as null,
    correspondenciaKey: "",
    validadoVisualmente: false,
    negativado: false,
    linhas: {
      create: {
        capturadaEm: agora,
        origem: "MANUAL" as const,
        status: "ATIVO" as const,
        ajusteLancePct: 0,
        cpc: null,
        cliques: null,
        impressoes: null,
        vendasConversao: null,
        custoConversao: null,
        roi: null,
      },
    },
  }))
}

export function chaveComparativo(
  tipo: string,
  chave: string,
  correspondencia: string | null | undefined,
): string {
  return `${tipo}::${chave}::${correspondenciaKey(correspondencia)}`
}

export type IndiceComVigente = {
  tipo: string
  chave: string
  correspondencia: string | null
  vigente: unknown
}

export function alinharComparativo<C extends { id: string; indices: IndiceComVigente[] }>(
  campanhas: C[],
): Array<{ tipo: string; chave: string; correspondencia: string | null; celulas: Record<string, unknown> }> {
  const ordemTipo = ["PALAVRA_CHAVE", "DISPOSITIVO", "LOCAL", "PUBLICO"]
  const rows = new Map<string, { tipo: string; chave: string; correspondencia: string | null; celulas: Record<string, unknown> }>()

  for (const campanha of campanhas) {
    for (const indice of campanha.indices) {
      const key = chaveComparativo(indice.tipo, indice.chave, indice.correspondencia)
      const row = rows.get(key) ?? {
        tipo: indice.tipo,
        chave: indice.chave,
        correspondencia: indice.correspondencia,
        celulas: {},
      }
      row.celulas[campanha.id] = indice.vigente
      rows.set(key, row)
    }
  }

  return [...rows.values()].sort((a, b) => {
    const ta = ordemTipo.indexOf(a.tipo)
    const tb = ordemTipo.indexOf(b.tipo)
    if (ta !== tb) return ta - tb
    const byChave = a.chave.localeCompare(b.chave, "pt-BR")
    if (byChave !== 0) return byChave
    return correspondenciaKey(a.correspondencia).localeCompare(correspondenciaKey(b.correspondencia))
  })
}

export function serializeLinha(l: {
  id: string
  capturadaEm: Date
  origem: string
  status: string
  ajusteLancePct: { toString(): string } | number
  cpc: { toString(): string } | number | null
  cliques: number | null
  impressoes: number | null
  vendasConversao: { toString(): string } | number | null
  custoConversao: { toString(): string } | number | null
  roi: { toString(): string } | number | null
  createdAt: Date
}) {
  return {
    id: l.id,
    capturadaEm: l.capturadaEm.toISOString(),
    origem: l.origem,
    status: l.status,
    ajusteLancePct: decimalNum(l.ajusteLancePct),
    cpc: l.cpc != null ? decimalNum(l.cpc) : null,
    cliques: l.cliques,
    impressoes: l.impressoes,
    vendasConversao: l.vendasConversao != null ? decimalNum(l.vendasConversao) : null,
    custoConversao: l.custoConversao != null ? decimalNum(l.custoConversao) : null,
    roi: l.roi != null ? decimalNum(l.roi) : null,
    createdAt: l.createdAt.toISOString(),
  }
}

export function serializeIndice(i: {
  id: string
  campanhaId: string
  tipo: string
  chave: string
  correspondencia: string | null
  validadoVisualmente: boolean
  negativado: boolean
  createdAt: Date
  updatedAt: Date
  linhas?: Parameters<typeof serializeLinha>[0][]
}) {
  const vigente = i.linhas ? vigenteDeLinhas(i.linhas) : null
  return {
    id: i.id,
    campanhaId: i.campanhaId,
    tipo: i.tipo,
    chave: i.chave,
    correspondencia: i.correspondencia,
    validadoVisualmente: i.validadoVisualmente,
    negativado: i.negativado,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    vigente: vigente ? serializeLinha(vigente) : null,
  }
}

export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002"
}
