import { z } from "zod"

export const origemAjusteEnum = z.enum(["FILA", "MANUAL"])
export const tipoAjusteEnum = z.enum(["BUDGET", "CPA_ALVO", "LANCE_SEGMENTO"])

export const ORIGEM_AJUSTE_LABELS: Record<string, string> = {
  FILA: "Fila",
  MANUAL: "Manual",
}

export const TIPO_AJUSTE_LABELS: Record<string, string> = {
  BUDGET: "Budget",
  CPA_ALVO: "CPA alvo",
  LANCE_SEGMENTO: "Lance de segmento",
}

/**
 * Registro manual de AjusteCampanha, fora da fila (origem=MANUAL). `data`
 * retroativa só é aceita aqui — ajustes de origem=FILA fixam `data` no
 * instante da confirmação (afiliados-registro-ajustes).
 */
export const ajusteCampanhaManualSchema = z.object({
  tipo: tipoAjusteEnum,
  valorAnterior: z.coerce.number().optional().nullable(),
  valorNovo: z.coerce.number().optional().nullable(),
  data: z.coerce.date().optional(),
  motivo: z.string().optional().nullable(),
})
