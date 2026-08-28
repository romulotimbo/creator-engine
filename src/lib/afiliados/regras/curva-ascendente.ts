import type { PrismaClient } from "@prisma/client"
import { decimalNum } from "@/lib/afiliados"
import { criarItemFilaComDedup } from "@/lib/afiliados/fila"
import { getLimiar } from "@/lib/afiliados/limiares"

/**
 * Regra de curva ascendente no Radar (ticket 06 —
 * .scratch/afiliados-ciclo-oportunidade-escala/issues/06-regra-curva-ascendente.md).
 *
 * Busca é o portão (sem ascensão, nunca entra na fila, independente da
 * rede); `trafficGrowth30` da rede modula prioridade dentro de busca↑.
 * Piso de magnitude ≥40% em pelo menos uma de duas janelas prontas (3-month
 * change, YoY change) — exceto saída-do-zero (YoY=∞), que ignora o piso de
 * magnitude mas continua sujeita ao piso de volume (300 buscas/mês).
 */

export type JanelaDisparadora = "3M" | "YOY" | "AMBAS" | null

export type AvaliacaoCurvaAscendente = {
  elegivel: boolean
  prioridade: "ALTA" | "MEDIA" | null
  janelaDisparadora: JanelaDisparadora
  saidaDoZero: boolean
}

export function avaliarCurvaAscendente(input: {
  /** Percentual como fração (0.45 = +45%). */
  threeMonthChangePct: number | null
  /** Percentual como fração; `Infinity` = saída-do-zero (histórico zerado virando volume positivo). */
  yoyChangePct: number | null
  volumeAbsolutoMensal: number | null
  /** Percentual de variação de tráfego da rede (trafficGrowth30), fração; null = indisponível. */
  trafficGrowthRedePct: number | null
  pisoMagnitudePct: number
  pisoVolumeMensal: number
}): AvaliacaoCurvaAscendente {
  const saidaDoZero = input.yoyChangePct === Infinity
  const pisoFracao = input.pisoMagnitudePct / 100

  const volumeOk = input.volumeAbsolutoMensal != null && input.volumeAbsolutoMensal >= input.pisoVolumeMensal

  let janelaDisparadora: JanelaDisparadora = null
  let elegivel = false

  if (saidaDoZero) {
    // Saída-do-zero: sempre conta como ascensão, sujeita SÓ ao piso de volume (sem piso de magnitude).
    elegivel = volumeOk
    janelaDisparadora = elegivel ? "YOY" : null
  } else {
    const tresMesesSobe = input.threeMonthChangePct != null && input.threeMonthChangePct >= pisoFracao
    const yoySobe = input.yoyChangePct != null && input.yoyChangePct >= pisoFracao
    if (tresMesesSobe && yoySobe) janelaDisparadora = "AMBAS"
    else if (tresMesesSobe) janelaDisparadora = "3M"
    else if (yoySobe) janelaDisparadora = "YOY"

    elegivel = janelaDisparadora !== null && volumeOk
    if (!elegivel) janelaDisparadora = null
  }

  if (!elegivel) {
    return { elegivel: false, prioridade: null, janelaDisparadora: null, saidaDoZero }
  }

  // Busca↑ + Rede↓ = prioridade máxima (janela antes da concorrência chegar).
  // Busca↑ + Rede↑ = prioridade média (mercado provado, concorrência já entrando).
  // Rede indisponível: sem penalidade nem bônus — média.
  const prioridade: "ALTA" | "MEDIA" =
    input.trafficGrowthRedePct != null && input.trafficGrowthRedePct < 0 ? "ALTA" : "MEDIA"

  return { elegivel: true, prioridade, janelaDisparadora, saidaDoZero }
}

/**
 * Avalia a curva ascendente para uma OfertaDecisao a partir dos Termo/SerieTermo
 * ligados a ela — no máximo um `ItemFila` por oferta, com o breakdown dos
 * termos disparadores em `evidencia` (mesmo padrão de `scoreBreakdown`).
 */
export async function avaliarRegraCurvaAscendente(client: PrismaClient, ofertaDecisaoId: string): Promise<void> {
  const oferta = await client.ofertaDecisao.findUnique({
    where: { id: ofertaDecisaoId },
    select: { id: true, statusDecisao: true, tendenciaTrafego30d: true },
  })
  if (!oferta) return
  if (!["GARIMPO", "ANALISE"].includes(oferta.statusDecisao)) return // priorização só faz sentido antes da conversão

  const termos = await client.termo.findMany({ where: { ofertaDecisaoId }, select: { id: true, termo: true } })
  if (!termos.length) return

  const [pisoMagnitudePct, pisoVolumeMensal] = await Promise.all([
    getLimiar(client, "radar.pisoMagnitudePct"),
    getLimiar(client, "teste.pisoVolumeBuscaMensal"), // única chave de piso-de-volume seedada (ver 2.2 do tasks.md)
  ])
  const trafficGrowthRedePct = oferta.tendenciaTrafego30d != null ? decimalNum(oferta.tendenciaTrafego30d) / 100 : null

  const disparadores: Array<{ termo: string; avaliacao: AvaliacaoCurvaAscendente }> = []

  for (const termo of termos) {
    const series = await client.serieTermo.findMany({
      where: { termoId: termo.id },
      orderBy: { data: "desc" },
      select: { data: true, valor: true, fonte: true, unidade: true },
    })
    if (!series.length) continue

    const { threeMonthChangePct, yoyChangePct, volumeAbsolutoMensal } = derivarJanelasDeSerie(
      series.map((s) => ({ data: s.data, valor: s.valor != null ? decimalNum(s.valor) : null, fonte: s.fonte, unidade: s.unidade })),
    )

    const avaliacao = avaliarCurvaAscendente({
      threeMonthChangePct,
      yoyChangePct,
      volumeAbsolutoMensal,
      trafficGrowthRedePct,
      pisoMagnitudePct,
      pisoVolumeMensal,
    })
    if (avaliacao.elegivel) disparadores.push({ termo: termo.termo, avaliacao })
  }

  if (!disparadores.length) return

  const prioridadeFinal = disparadores.some((d) => d.avaliacao.prioridade === "ALTA") ? "ALTA" : "MEDIA"

  await criarItemFilaComDedup(client, {
    tipoAlvo: "OFERTA",
    alvoId: ofertaDecisaoId,
    regra: "radar.curvaAscendente",
    prioridade: prioridadeFinal,
    resumo: `Curva ascendente: ${disparadores.map((d) => d.termo).join(", ")} — priorizar para teste.`,
    evidencia: {
      termos: disparadores.map((d) => ({
        termo: d.termo,
        janela: d.avaliacao.janelaDisparadora,
        saidaDoZero: d.avaliacao.saidaDoZero,
        prioridade: d.avaliacao.prioridade,
      })),
    },
  })
}

/**
 * Deriva janelas prontas (3-month change, YoY change, volume absoluto mensal)
 * a partir de uma série ordenada por data desc, na MESMA fonte+unidade da
 * leitura mais recente (nunca mistura índice com volume, nem fontes).
 */
export function derivarJanelasDeSerie(
  serie: Array<{ data: Date; valor: number | null; fonte: string; unidade: string }>,
): { threeMonthChangePct: number | null; yoyChangePct: number | null; volumeAbsolutoMensal: number | null } {
  const comValor = serie.filter((s) => s.valor != null)
  if (!comValor.length) return { threeMonthChangePct: null, yoyChangePct: null, volumeAbsolutoMensal: null }

  const atual = comValor[0]
  const mesmaFonte = comValor.filter((s) => s.fonte === atual.fonte && s.unidade === atual.unidade)

  function pctEm(diasAlvo: number): number | null {
    const alvoMs = atual.data.getTime() - diasAlvo * 86_400_000
    const tolerancia = diasAlvo * 86_400_000 * 0.2
    const ponto = mesmaFonte.slice(1).find((p) => Math.abs(p.data.getTime() - alvoMs) <= tolerancia)
    if (!ponto || ponto.valor == null) return null
    if (ponto.valor === 0) return atual.valor! > 0 ? Infinity : 0
    return (atual.valor! - ponto.valor) / ponto.valor
  }

  return {
    threeMonthChangePct: pctEm(90),
    yoyChangePct: pctEm(365),
    volumeAbsolutoMensal: atual.unidade === "ABSOLUTO" ? atual.valor : null,
  }
}
