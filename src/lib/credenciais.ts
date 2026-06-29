import { z } from "zod"

export const credSelect = {
  id: true,
  chave: true,
  categoria: true,
  notas: true,
  global: true,
  personaId: true,
  ferramentaId: true,
  createdAt: true,
  ferramenta: { select: { id: true, nome: true } },
} as const

export const credCreateSchema = z
  .object({
    personaId: z.string().optional().nullable(),
    ferramentaId: z.string().optional().nullable(),
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
    } else {
      if (!data.personaId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "personaId obrigatório", path: ["personaId"] })
      }
      if (data.ferramentaId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credencial de persona não aceita ferramentaId", path: ["ferramentaId"] })
      }
    }
  })

export const credUpdateSchema = z.object({
  ferramentaId: z.string().optional().nullable(),
  categoria: z.string().min(1).optional(),
  chave: z.string().min(1).optional(),
  valor: z.string().min(1).optional(),
  notas: z.string().optional().nullable(),
})

export function serializeCredencial(c: {
  id: string
  chave: string
  categoria: string
  notas: string | null
  global: boolean
  personaId: string | null
  ferramentaId: string | null
  createdAt: Date
  ferramenta?: { id: string; nome: string } | null
}) {
  const { ferramenta, ...rest } = c
  return {
    ...rest,
    ferramentaNome: ferramenta?.nome ?? null,
    createdAt: c.createdAt.toISOString(),
  }
}
