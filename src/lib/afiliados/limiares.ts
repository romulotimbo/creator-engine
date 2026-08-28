import type { PrismaClient } from "@prisma/client"
import { z } from "zod"

/**
 * Mecanismo genérico de limiares (afiliados-limiares). Cada chave documenta seu
 * shape esperado aqui — validação Zod na leitura evita que LimiarGlobal vire
 * "gaveta de tudo" sem tipagem (design.md → Risks).
 */
export const LIMIAR_SCHEMAS = {
  "teste.pisoVolumeBuscaMensal": z.number(),
  "radar.pisoMagnitudePct": z.number(),
  "segmento.volumeMinimoConversoes": z.number(),
  "segmento.diferencaCpaMinimaPct": z.number(),
  "folego.tetoInicialUsd": z.number(),
  "folego.tetoCaixaFormadoUsd": z.number(),
  "conversaoOffline.ativoPorFase": z.object({
    TESTANDO: z.boolean().optional(),
    ESCALANDO: z.boolean().optional(),
  }),
  // Ticket 09 não travou um número concreto ("valor concreto não é decisão de
  // modelagem, fica para configuração") — defaults abaixo são ponto de partida
  // ajustável, sem calibração de dado real ainda (mesma natureza do ticket 10).
  "escala.volumeMinimoVendas": z.number(),
  "escala.roiMinimoFolga": z.number(),
  // Ticket 10: corte de continuidade mensal, binário, sem zona intermediária.
  "escala.roiMinimoMensal": z.number(),
} as const

export type LimiarKey = keyof typeof LIMIAR_SCHEMAS
export type LimiarValue<K extends LimiarKey> = z.infer<(typeof LIMIAR_SCHEMAS)[K]>

/** Defaults documentados — usados quando a chave não foi semeada (nunca falha). */
export const LIMIAR_DEFAULTS: { [K in LimiarKey]: LimiarValue<K> } = {
  "teste.pisoVolumeBuscaMensal": 300,
  "radar.pisoMagnitudePct": 40,
  "segmento.volumeMinimoConversoes": 3,
  "segmento.diferencaCpaMinimaPct": 25,
  "folego.tetoInicialUsd": 200,
  "folego.tetoCaixaFormadoUsd": 600,
  "conversaoOffline.ativoPorFase": { TESTANDO: false, ESCALANDO: true },
  "escala.volumeMinimoVendas": 5,
  "escala.roiMinimoFolga": 0.3,
  "escala.roiMinimoMensal": 0.15,
}

function readOverride<K extends LimiarKey>(
  chave: K,
  limiaresOverride: unknown,
): LimiarValue<K> | undefined {
  if (!limiaresOverride || typeof limiaresOverride !== "object") return undefined
  const record = limiaresOverride as Record<string, unknown>
  if (!(chave in record)) return undefined
  const parsed = LIMIAR_SCHEMAS[chave].safeParse(record[chave])
  return parsed.success ? (parsed.data as LimiarValue<K>) : undefined
}

/**
 * Resolve um limiar: override do produto > LimiarGlobal > default documentado.
 * Aceita `limiaresOverride` já carregado (evita round-trip) ou `produtoId` para
 * buscar sob demanda.
 */
export async function getLimiar<K extends LimiarKey>(
  client: PrismaClient,
  chave: K,
  opts?: { produtoId?: string | null; limiaresOverride?: unknown },
): Promise<LimiarValue<K>> {
  let override = opts?.limiaresOverride
  if (override === undefined && opts?.produtoId) {
    const produto = await client.produtoAfiliado.findUnique({
      where: { id: opts.produtoId },
      select: { limiaresOverride: true },
    })
    override = produto?.limiaresOverride ?? null
  }

  const fromOverride = readOverride(chave, override)
  if (fromOverride !== undefined) return fromOverride

  const global = await client.limiarGlobal.findUnique({ where: { chave } })
  if (global) {
    const parsed = LIMIAR_SCHEMAS[chave].safeParse(global.valor)
    if (parsed.success) return parsed.data as LimiarValue<K>
  }

  return LIMIAR_DEFAULTS[chave]
}

export const limiarGlobalSchema = z.object({
  chave: z.string().min(1),
  valor: z.unknown(),
  descricao: z.string().optional().nullable(),
})
