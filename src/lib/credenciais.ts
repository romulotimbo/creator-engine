import { z } from "zod"

/** Categorias típicas de credencial por persona / ContaTrafego (não promover a global). */
export const CATEGORIAS_PERSONA = ["instagram", "tiktok", "youtube", "fanvue", "braip", "proxy", "email", "outro"] as const

/** Infra compartilhada — listagem global em /ferramentas. */
export const globalCredenciaisWhere = { global: true } as const

export const credSelect = {
  id: true,
  chave: true,
  categoria: true,
  servico: true,
  notas: true,
  global: true,
  personaId: true,
  contaTrafegoId: true,
  ferramentaId: true,
  createdAt: true,
  ferramenta: { select: { id: true, nome: true } },
} as const

/** Fallback se migration pendente (sem ferramentaId/servico/contaTrafegoId). */
export const credSelectLegacy = {
  id: true,
  chave: true,
  categoria: true,
  notas: true,
  global: true,
  personaId: true,
  createdAt: true,
} as const

export const credCreateSchema = z
  .object({
    personaId: z.string().optional().nullable(),
    contaTrafegoId: z.string().optional().nullable(),
    ferramentaId: z.string().optional().nullable(),
    servico: z.string().optional().nullable(),
    global: z.boolean().default(false),
    categoria: z.string().min(1, "Categoria obrigatória"),
    chave: z.string().min(1, "Chave obrigatória"),
    valor: z.string().min(1, "Valor obrigatório"),
    notas: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.global) {
      if (data.personaId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credencial global não aceita personaId", path: ["personaId"] })
      }
      if (data.contaTrafegoId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credencial global não aceita contaTrafegoId", path: ["contaTrafegoId"] })
      }
    } else {
      const hasPersona = !!data.personaId
      const hasTrafego = !!data.contaTrafegoId
      if (hasPersona && hasTrafego) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use personaId ou contaTrafegoId, não ambos", path: ["contaTrafegoId"] })
      }
      if (!hasPersona && !hasTrafego) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "personaId ou contaTrafegoId obrigatório", path: ["personaId"] })
      }
      if (data.ferramentaId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ferramentaId só em credenciais globais", path: ["ferramentaId"] })
      }
      if (data.servico) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "servico só em credenciais globais", path: ["servico"] })
      }
    }
  })

export const credUpdateSchema = z.object({
  ferramentaId: z.string().optional().nullable(),
  servico: z.string().optional().nullable(),
  categoria: z.string().min(1).optional(),
  chave: z.string().min(1).optional(),
  valor: z.string().min(1).optional(),
  notas: z.string().optional().nullable(),
})

export function serializeCredencial(c: {
  id: string
  chave: string
  categoria: string
  servico?: string | null
  notas: string | null
  global: boolean
  personaId: string | null
  contaTrafegoId?: string | null
  ferramentaId?: string | null
  createdAt: Date
  ferramenta?: { id: string; nome: string } | null
}) {
  const { ferramenta, ...rest } = c
  return {
    ...rest,
    ferramentaId: c.ferramentaId ?? null,
    contaTrafegoId: c.contaTrafegoId ?? null,
    servico: c.servico ?? null,
    ferramentaNome: ferramenta?.nome ?? null,
    createdAt: c.createdAt.toISOString(),
  }
}

export function servicoDisplayLabel(c: { servico?: string | null; ferramentaNome?: string | null }): string {
  const s = c.servico?.trim()
  if (s) return s
  if (c.ferramentaNome) return c.ferramentaNome
  return "—"
}
