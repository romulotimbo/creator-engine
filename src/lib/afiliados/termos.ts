import { z } from "zod"

export const fonteTermoEnum = z.enum([
  "GOOGLE_KEYWORD_PLANNER",
  "BING",
  "GLIMPSE",
  "SEMRUSH",
  "FLOWSPY",
  "MANUAL",
])
export const unidadeSerieTermoEnum = z.enum(["ABSOLUTO", "IMPRESSOES", "INDICE_0_100"])

export const FONTE_TERMO_LABELS: Record<string, string> = {
  GOOGLE_KEYWORD_PLANNER: "Google Keyword Planner",
  BING: "Bing",
  GLIMPSE: "Glimpse",
  SEMRUSH: "SEMrush",
  FLOWSPY: "FlowSpy",
  MANUAL: "Manual",
}

export const UNIDADE_SERIE_TERMO_LABELS: Record<string, string> = {
  ABSOLUTO: "Absoluto",
  IMPRESSOES: "Impressões",
  INDICE_0_100: "Índice 0–100",
}

/**
 * Termo pertence a OfertaDecisao OU ProdutoAfiliado, nunca aos dois, nunca a
 * Campanha (afiliados-termo-demanda). Reforçado aqui — Prisma não expressa
 * XOR de FK nativamente (o CHECK em SQL de prod é a segunda camada).
 */
export const termoSchema = z
  .object({
    termo: z.string().min(1),
    produtoId: z.string().optional().nullable(),
    ofertaDecisaoId: z.string().optional().nullable(),
  })
  .refine((data) => Boolean(data.produtoId) !== Boolean(data.ofertaDecisaoId), {
    message: "Termo deve pertencer a exatamente um: produtoId ou ofertaDecisaoId",
    path: ["produtoId"],
  })

export const termoUpdateSchema = z.object({
  termo: z.string().min(1).optional(),
})

/** Entrada manual de SerieTermo (origem="manual") — ingestão automatizada usa src/lib/afiliados/ingestao.ts. */
export const serieTermoManualSchema = z.object({
  geo: z.string().min(1),
  fonte: fonteTermoEnum,
  data: z.coerce.date(),
  valor: z.coerce.number().optional().nullable(),
  unidade: unidadeSerieTermoEnum,
})
