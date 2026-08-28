import type { PrismaClient } from "@prisma/client"
import { decimalNum } from "@/lib/afiliados"
import { criarItemFilaComDedup } from "@/lib/afiliados/fila"
import { getLimiar } from "@/lib/afiliados/limiares"

/**
 * Otimização de segmentos geo×dispositivo (ticket 11 —
 * .scratch/afiliados-ciclo-oportunidade-escala/issues/11-segmentos-geo-dispositivo.md).
 * Só roda em `ESCALANDO` (otimizar segmentos precede subir verba, ticket 10).
 */

/** `segments.device` tem 7 valores; só os 3 que a UI do Keyword Planner reconhece são acionáveis. */
export const DISPOSITIVOS_ACIONAVEIS = ["DESKTOP", "MOBILE", "TABLET"] as const

export type AchadoSegmento = {
  dimensao: "GEO" | "DISPOSITIVO"
  valor: string
  cpaSegmento: number
  cpaMedioCampanha: number
  diferencaPct: number
  conversoes: number
}

/**
 * Detecta segmentos (geo ou dispositivo) com CPA divergente o suficiente do
 * CPA médio da campanha, respeitando volume mínimo. Dispositivo é filtrado
 * para os 3 valores acionáveis — os 4 extras ficam como metadado, não geram
 * recomendação.
 */
export function detectarSegmentosDivergentes(input: {
  segmentos: Array<{ dimensao: "GEO" | "DISPOSITIVO"; valor: string; gasto: number; conversoes: number }>
  cpaMedioCampanha: number
  volumeMinimoConversoes: number
  diferencaCpaMinimaPct: number
}): AchadoSegmento[] {
  const achados: AchadoSegmento[] = []
  for (const s of input.segmentos) {
    if (s.dimensao === "DISPOSITIVO" && !DISPOSITIVOS_ACIONAVEIS.includes(s.valor as (typeof DISPOSITIVOS_ACIONAVEIS)[number])) {
      continue
    }
    if (s.conversoes < input.volumeMinimoConversoes || s.conversoes <= 0) continue

    const cpaSegmento = s.gasto / s.conversoes
    const diferencaPct =
      input.cpaMedioCampanha > 0 ? (Math.abs(cpaSegmento - input.cpaMedioCampanha) / input.cpaMedioCampanha) * 100 : 0

    if (diferencaPct >= input.diferencaCpaMinimaPct) {
      achados.push({ dimensao: s.dimensao, valor: s.valor, cpaSegmento, cpaMedioCampanha: input.cpaMedioCampanha, diferencaPct, conversoes: s.conversoes })
    }
  }
  return achados
}

function inicioMesCorrente(agora: Date): Date {
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1))
}
function chaveMesCorrente(agora: Date): string {
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, "0")}`
}

/**
 * Avalia a regra de otimização de segmento — gera no máximo um `ItemFila` por
 * Campanha por mês (`escala.otimizacaoSegmento:YYYY-MM`), combinando achados
 * de geo e dispositivo no mesmo item.
 */
export async function avaliarRegraSegmento(client: PrismaClient, campanhaId: string, agora: Date = new Date()): Promise<void> {
  const campanha = await client.campanha.findUnique({
    where: { id: campanhaId },
    select: { id: true, status: true, produtoId: true },
  })
  if (!campanha || campanha.status !== "ESCALANDO") return

  const inicio = inicioMesCorrente(agora)

  const [segmentos, snapshotsCampanha, volumeMinimoConversoes, diferencaCpaMinimaPct] = await Promise.all([
    client.segmentoCampanhaSnapshot.findMany({
      where: { campanhaId, data: { gte: inicio, lte: agora } },
      select: { dimensao: true, valor: true, gasto: true, conversoes: true },
    }),
    client.campanhaSnapshot.findMany({
      where: { campanhaId, dataSnapshot: { gte: inicio, lte: agora } },
      select: { gasto: true, conversoes: true },
    }),
    getLimiar(client, "segmento.volumeMinimoConversoes", { produtoId: campanha.produtoId }),
    getLimiar(client, "segmento.diferencaCpaMinimaPct", { produtoId: campanha.produtoId }),
  ])
  if (!segmentos.length) return

  // Agrega por (dimensao, valor) — a coleta é diária, o mês soma os dias.
  const agregados = new Map<string, { dimensao: "GEO" | "DISPOSITIVO"; valor: string; gasto: number; conversoes: number }>()
  for (const s of segmentos) {
    const key = `${s.dimensao}::${s.valor}`
    const atual = agregados.get(key) ?? { dimensao: s.dimensao, valor: s.valor, gasto: 0, conversoes: 0 }
    atual.gasto += s.gasto != null ? decimalNum(s.gasto) : 0
    atual.conversoes += s.conversoes != null ? decimalNum(s.conversoes) : 0
    agregados.set(key, atual)
  }

  const gastoCampanha = snapshotsCampanha.reduce((acc, s) => acc + (s.gasto != null ? decimalNum(s.gasto) : 0), 0)
  const conversoesCampanha = snapshotsCampanha.reduce((acc, s) => acc + (s.conversoes != null ? decimalNum(s.conversoes) : 0), 0)
  const cpaMedioCampanha = conversoesCampanha > 0 ? gastoCampanha / conversoesCampanha : 0
  if (cpaMedioCampanha <= 0) return

  const achados = detectarSegmentosDivergentes({
    segmentos: [...agregados.values()],
    cpaMedioCampanha,
    volumeMinimoConversoes,
    diferencaCpaMinimaPct,
  })
  if (!achados.length) return

  const resumoPartes = achados.map((a) => {
    const direcao = a.cpaSegmento < a.cpaMedioCampanha ? "CPA melhor" : "CPA pior"
    return `${a.dimensao === "GEO" ? a.valor : a.valor.toLowerCase()} (${direcao}, ${a.diferencaPct.toFixed(0)}%)`
  })

  await criarItemFilaComDedup(client, {
    tipoAlvo: "CAMPANHA",
    alvoId: campanhaId,
    regra: `escala.otimizacaoSegmento:${chaveMesCorrente(agora)}`,
    prioridade: "MEDIA",
    resumo: `Otimização de segmento (${chaveMesCorrente(agora)}): ${resumoPartes.join("; ")} — ajustar lance por segmento.`,
    evidencia: { mesReferencia: chaveMesCorrente(agora), achados },
  })
}
