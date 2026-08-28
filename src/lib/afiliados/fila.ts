import { z } from "zod"

export const tipoAlvoFilaEnum = z.enum(["OFERTA", "CAMPANHA"])
export const statusItemFilaEnum = z.enum(["ABERTO", "ADIADO", "APLICADO", "DISPENSADO", "EXPIRADO"])
export const prioridadeFilaEnum = z.enum(["ALTA", "MEDIA", "BAIXA"])

export const TIPO_ALVO_FILA_LABELS: Record<string, string> = {
  OFERTA: "Oferta",
  CAMPANHA: "Campanha",
}

export const STATUS_ITEM_FILA_LABELS: Record<string, string> = {
  ABERTO: "Aberto",
  ADIADO: "Adiado",
  APLICADO: "Aplicado",
  DISPENSADO: "Dispensado",
  EXPIRADO: "Expirado",
}

export const PRIORIDADE_FILA_LABELS: Record<string, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
}

/** Estados terminais — regra pode gerar novo item para o mesmo alvo depois disso. */
export const STATUS_ITEM_FILA_TERMINAIS = ["APLICADO", "DISPENSADO", "EXPIRADO"] as const

const ajusteConfirmSchema = z.object({
  tipoAjuste: z.enum(["BUDGET", "CPA_ALVO", "LANCE_SEGMENTO"]),
  valorAplicado: z.coerce.number(),
  valorAnterior: z.coerce.number().optional().nullable(),
  motivo: z.string().optional().nullable(),
})

/**
 * Ação do operador sobre um ItemFila: confirmar (→ APLICADO, opcionalmente
 * criando um ou mais `AjusteCampanha` com o(s) valor(es) real(is) aplicado(s)
 * — um item que empacota geo+dispositivo pode gerar um ajuste por segmento
 * confirmado, todos referenciando o mesmo `itemFilaId`), adiar (→ ADIADO) ou
 * dispensar (→ DISPENSADO). O formato singular (`tipoAjuste`/`valorAplicado`)
 * é açúcar sintático para `ajustes: [um item]` — o backend sempre trabalha
 * com a lista.
 */
export const itemFilaAcaoSchema = z
  .discriminatedUnion("acao", [
    z.object({
      acao: z.literal("confirmar"),
      valorAplicado: z.coerce.number().optional().nullable(),
      tipoAjuste: z.enum(["BUDGET", "CPA_ALVO", "LANCE_SEGMENTO"]).optional().nullable(),
      valorAnterior: z.coerce.number().optional().nullable(),
      motivo: z.string().optional().nullable(),
      ajustes: z.array(ajusteConfirmSchema).optional(),
    }),
    z.object({ acao: z.literal("adiar") }),
    z.object({ acao: z.literal("dispensar"), motivo: z.string().optional().nullable() }),
  ])
  .refine(
    (data) => !(data.acao === "confirmar" && data.tipoAjuste && data.valorAplicado == null),
    { message: "valorAplicado é obrigatório ao confirmar um ajuste (tipoAjuste informado)", path: ["valorAplicado"] },
  )

/** Normaliza a ação de confirmação para a lista de ajustes a criar (formato singular vira lista de 1). */
export function ajustesDaConfirmacao(
  acao: Extract<z.infer<typeof itemFilaAcaoSchema>, { acao: "confirmar" }>,
): Array<z.infer<typeof ajusteConfirmSchema>> {
  if (acao.ajustes?.length) return acao.ajustes
  if (acao.tipoAjuste && acao.valorAplicado != null) {
    return [{ tipoAjuste: acao.tipoAjuste, valorAplicado: acao.valorAplicado, valorAnterior: acao.valorAnterior, motivo: acao.motivo }]
  }
  return []
}

/**
 * Cria um ItemFila com dedup por (regra, tipoAlvo, alvoId) enquanto o item
 * existente não estiver em estado terminal — a mesma regra não duplica um
 * item já ABERTO/ADIADO para o mesmo alvo. Prioridade é sempre atribuída pela
 * regra geradora, nunca recalculada aqui (D7, design.md).
 */
export async function criarItemFilaComDedup<
  Client extends {
    itemFila: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findFirst: (args: any) => Promise<{ id: string } | null>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: (args: any) => Promise<unknown>
    }
  },
>(
  client: Client,
  input: {
    tipoAlvo: "OFERTA" | "CAMPANHA"
    alvoId: string
    regra: string
    prioridade: "ALTA" | "MEDIA" | "BAIXA"
    resumo: string
    evidencia?: unknown
  },
): Promise<{ created: boolean; itemId: string }> {
  const existente = await client.itemFila.findFirst({
    where: {
      regra: input.regra,
      tipoAlvo: input.tipoAlvo,
      alvoId: input.alvoId,
      status: { notIn: STATUS_ITEM_FILA_TERMINAIS },
    },
  })
  if (existente) return { created: false, itemId: existente.id }

  const item = (await client.itemFila.create({
    data: {
      tipoAlvo: input.tipoAlvo,
      alvoId: input.alvoId,
      regra: input.regra,
      prioridade: input.prioridade,
      resumo: input.resumo,
      evidencia: input.evidencia ?? undefined,
    },
  })) as { id: string }
  return { created: true, itemId: item.id }
}
