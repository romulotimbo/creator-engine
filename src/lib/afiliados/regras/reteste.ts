import type { PrismaClient } from "@prisma/client"
import { decimalNum } from "@/lib/afiliados"
import { criarItemFilaComDedup } from "@/lib/afiliados/fila"
import { getLimiar } from "@/lib/afiliados/limiares"
import { avaliarRegraTeste } from "./teste"

/**
 * Re-teste e fôlego financeiro (ticket 08 —
 * .scratch/afiliados-ciclo-oportunidade-escala/issues/08-regras-reteste-folego.md).
 *
 * Pré-condição de entrada (árvore inteira): campanha `TESTANDO` bate o teto
 * de teste (ticket 07) **e** tem 1–3 `VendaAfiliado` com `status IN
 * (APROVADA, PENDENTE)` **e** `Campanha.roiReal` empata com o breakeven
 * (±10%). Fora dessa zona, nenhuma decisão de re-teste é gerada — cai no
 * kill normal do ticket 07.
 */

export type TendenciaTermo = "INDISPONIVEL" | "QUEDA" | "ESTAVEL" | "CRESCENDO"

export type PontoSerie = { data: Date; valor: number | null; fonte: string; unidade: string }

// Prioridade de granularidade com fallback: 7d → 30d → 3m → 6m → 1 ano.
const JANELAS_DIAS = [7, 30, 90, 180, 365] as const

function maxData(pontos: PontoSerie[]): number {
  return Math.max(...pontos.map((p) => p.data.getTime()))
}

/**
 * Classifica a tendência de busca de um termo comparando contra o ponto
 * anterior da MESMA fonte + MESMA unidade (nunca mistura índice com volume,
 * nunca compara fontes diferentes). Limiar: queda ≤ -10%, estável entre
 * -10% e +10%, crescendo ≥ +10%.
 */
export function avaliarTendenciaTermo(
  pontos: PontoSerie[],
): { tendencia: TendenciaTermo; janelaDias: number | null; percentual: number | null } {
  if (!pontos.length) return { tendencia: "INDISPONIVEL", janelaDias: null, percentual: null }

  const porFonteUnidade = new Map<string, PontoSerie[]>()
  for (const p of pontos) {
    if (p.valor == null) continue
    const key = `${p.fonte}::${p.unidade}`
    if (!porFonteUnidade.has(key)) porFonteUnidade.set(key, [])
    porFonteUnidade.get(key)!.push(p)
  }
  if (!porFonteUnidade.size) return { tendencia: "INDISPONIVEL", janelaDias: null, percentual: null }

  // Usa o grupo (fonte+unidade) com a leitura mais recente disponível.
  let melhorGrupo: PontoSerie[] | null = null
  for (const grupo of porFonteUnidade.values()) {
    if (!melhorGrupo || maxData(grupo) > maxData(melhorGrupo)) melhorGrupo = grupo
  }
  const ordenado = [...melhorGrupo!].sort((a, b) => b.data.getTime() - a.data.getTime())
  const atual = ordenado[0]

  for (const janelaDias of JANELAS_DIAS) {
    const alvoMs = atual.data.getTime() - janelaDias * 86_400_000
    const tolerancia = janelaDias * 86_400_000 * 0.5
    const candidato = ordenado
      .slice(1)
      .find((p) => Math.abs(p.data.getTime() - alvoMs) <= tolerancia)
    if (!candidato) continue

    const percentual =
      candidato.valor === 0 ? (atual.valor! > 0 ? Infinity : 0) : (atual.valor! - candidato.valor!) / candidato.valor!
    const tendencia: TendenciaTermo = percentual <= -0.1 ? "QUEDA" : percentual >= 0.1 ? "CRESCENDO" : "ESTAVEL"
    return { tendencia, janelaDias, percentual }
  }

  return { tendencia: "INDISPONIVEL", janelaDias: null, percentual: null }
}

export type DecisaoReteste =
  | { tipo: "EXTENSAO"; comissoesMin: number; comissoesMax: number }
  | { tipo: "REDUZIR_CPA"; faixaMinPct: number; faixaMaxPct: number }

/** Trends indisponível/sem sinal favorável → default 1 comissão. Estável/crescendo → 1-2. Queda → reduzir CPA, sem estender. */
export function decidirReteste(tendencia: TendenciaTermo): DecisaoReteste {
  if (tendencia === "QUEDA") return { tipo: "REDUZIR_CPA", faixaMinPct: 5, faixaMaxPct: 10 }
  if (tendencia === "ESTAVEL" || tendencia === "CRESCENDO") return { tipo: "EXTENSAO", comissoesMin: 1, comissoesMax: 2 }
  return { tipo: "EXTENSAO", comissoesMin: 1, comissoesMax: 1 }
}

/**
 * Fôlego financeiro: teto absoluto em USD, valendo o MENOR entre a extensão
 * calculada em comissões e o restante do teto do perfil ativo
 * (`PortfolioConfig.perfilFolego`). Acumulado por produto entre campanhas
 * ligadas via `campanhaOrigemId` — usa o gasto além do teto normal de cada
 * campanha da cadeia como proxy do fôlego já consumido.
 */
export function aplicarFolego(input: {
  extensaoCalculadaUsd: number
  tetoPerfilUsd: number
  folegoJaConsumidoUsd: number
}): number {
  const restante = Math.max(0, input.tetoPerfilUsd - input.folegoJaConsumidoUsd)
  return Math.min(input.extensaoCalculadaUsd, restante)
}

/**
 * Resolve todas as Campanhas da mesma cadeia de re-teste: sobe por
 * `campanhaOrigemId` até a raiz, depois desce por todos os descendentes
 * (retestes em conta nova, perfil CAIXA_FORMADO) — não é "todas as campanhas
 * do produto" (isso incluiria testes falhos sem relação com esta cadeia).
 */
async function campanhasDaCadeia(client: PrismaClient, campanhaId: string): Promise<string[]> {
  let raizId = campanhaId
  let cursor = await client.campanha.findUnique({ where: { id: raizId }, select: { campanhaOrigemId: true } })
  while (cursor?.campanhaOrigemId) {
    raizId = cursor.campanhaOrigemId
    cursor = await client.campanha.findUnique({ where: { id: raizId }, select: { campanhaOrigemId: true } })
  }

  const visitados = new Set<string>()
  const fila = [raizId]
  while (fila.length) {
    const id = fila.shift()!
    if (visitados.has(id)) continue
    visitados.add(id)
    const filhos = await client.campanha.findMany({ where: { campanhaOrigemId: id }, select: { id: true } })
    for (const f of filhos) fila.push(f.id)
  }
  return [...visitados]
}

async function folegoConsumidoDaCadeia(client: PrismaClient, campanhaId: string, comissaoValorUsd: number): Promise<number> {
  const ids = await campanhasDaCadeia(client, campanhaId)
  const campanhas = await client.campanha.findMany({
    where: { id: { in: ids } },
    select: { gastoTotalAcumulado: true },
  })
  const teto = avaliarRegraTeste({ comissaoValorUsd, gastoAcumuladoUsd: 0, checkoutsCount: 0 }).tetoUsd

  let consumido = 0
  for (const c of campanhas) {
    const gasto = c.gastoTotalAcumulado != null ? decimalNum(c.gastoTotalAcumulado) : 0
    consumido += Math.max(0, gasto - teto)
  }
  return consumido
}

/**
 * Avalia a árvore de re-teste para uma Campanha `TESTANDO` e gera `ItemFila`
 * quando a pré-condição composta (teto batido + 1-3 vendas + ROI empatando)
 * é satisfeita.
 */
export async function avaliarRegraReteste(client: PrismaClient, campanhaId: string): Promise<void> {
  const campanha = await client.campanha.findUnique({
    where: { id: campanhaId },
    select: {
      id: true,
      status: true,
      produtoId: true,
      gastoTotalAcumulado: true,
      roiReal: true,
      produto: { select: { comissaoValor: true } },
    },
  })
  if (!campanha || campanha.status !== "TESTANDO") return
  if (campanha.produto.comissaoValor == null) return

  const comissaoValorUsd = decimalNum(campanha.produto.comissaoValor)
  const gastoAcumuladoUsd = campanha.gastoTotalAcumulado != null ? decimalNum(campanha.gastoTotalAcumulado) : 0
  const teto = avaliarRegraTeste({ comissaoValorUsd, gastoAcumuladoUsd, checkoutsCount: 0 })
  if (!teto.tetoAtingido) return

  const numVendas = await client.vendaAfiliado.count({
    where: { campanhaId, status: { in: ["APROVADA", "PENDENTE"] } },
  })
  if (numVendas < 1 || numVendas > 3) return

  const roiReal = campanha.roiReal != null ? decimalNum(campanha.roiReal) : null
  if (roiReal == null || roiReal < -0.1 || roiReal > 0.1) return

  // Tendência de busca do produto — usa todas as séries de todos os Termo ligados ao produto.
  const termos = await client.termo.findMany({ where: { produtoId: campanha.produtoId }, select: { id: true } })
  const series = termos.length
    ? await client.serieTermo.findMany({
        where: { termoId: { in: termos.map((t) => t.id) } },
        select: { data: true, valor: true, fonte: true, unidade: true },
      })
    : []
  const pontos: PontoSerie[] = series.map((s) => ({
    data: s.data,
    valor: s.valor != null ? decimalNum(s.valor) : null,
    fonte: s.fonte,
    unidade: s.unidade,
  }))
  const { tendencia } = avaliarTendenciaTermo(pontos)
  const decisao = decidirReteste(tendencia)

  if (decisao.tipo === "REDUZIR_CPA") {
    await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: campanhaId,
      regra: "reteste.reduzirCpa",
      prioridade: "MEDIA",
      resumo: `Re-teste: teto batido, 1-3 vendas, ROI empatando — busca em queda, recomenda reduzir CPA alvo em ${decisao.faixaMinPct}-${decisao.faixaMaxPct}%.`,
      evidencia: { tendencia, numVendas, roiReal },
    })
    return
  }

  const [perfil, tetoInicial, tetoCaixaFormado] = await Promise.all([
    client.portfolioConfig.findUnique({ where: { id: "default" } }),
    getLimiar(client, "folego.tetoInicialUsd"),
    getLimiar(client, "folego.tetoCaixaFormadoUsd"),
  ])
  const tetoPerfilUsd = perfil?.perfilFolego === "CAIXA_FORMADO" ? tetoCaixaFormado : tetoInicial

  const extensaoCalculadaUsd = decisao.comissoesMax * comissaoValorUsd
  const folegoJaConsumidoUsd = await folegoConsumidoDaCadeia(client, campanhaId, comissaoValorUsd)
  const extensaoFinalUsd = aplicarFolego({ extensaoCalculadaUsd, tetoPerfilUsd, folegoJaConsumidoUsd })

  await criarItemFilaComDedup(client, {
    tipoAlvo: "CAMPANHA",
    alvoId: campanhaId,
    regra: "reteste.extensao",
    prioridade: "MEDIA",
    resumo: `Re-teste: teto batido, 1-3 vendas, ROI empatando — Trends ${tendencia.toLowerCase()}, estender teto em até US$${extensaoFinalUsd.toFixed(2)} (${decisao.comissoesMin}-${decisao.comissoesMax} comissões, sujeito ao fôlego financeiro).`,
    evidencia: { tendencia, numVendas, roiReal, extensaoCalculadaUsd, tetoPerfilUsd, folegoJaConsumidoUsd, extensaoFinalUsd },
  })
}
