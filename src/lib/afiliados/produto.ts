import { decimalNum } from "@/lib/afiliados"
import { alertaOrcamentoEstourado, computeProdutoRollups } from "./rollups"
import type { ConversionPoint, TipoProdutoAfiliado } from "@prisma/client"

type Dec = { toString(): string } | number | null | undefined

function n(v: Dec): number | null {
  if (v == null) return null
  return decimalNum(v)
}

export function mapHerancaOfertaParaProduto(oferta: {
  conversionPoint: ConversionPoint | null
  tipoProduto: TipoProdutoAfiliado | null
  ltvEstimadoRebill: { toString(): string } | number | null
  scoreCalculado: number
  comissaoValor: { toString(): string } | number | null
  budgetTesteAlocado: { toString(): string } | number | null
  cpaAlvoBreakeven: { toString(): string } | number | null
  criterioPausa: string | null
  criterioEscala: string | null
  domainUsed: string | null
  nextReviewAt: Date | null
}) {
  const comissaoValor = oferta.comissaoValor != null ? decimalNum(oferta.comissaoValor) : null
  const cpaAlvo =
    oferta.cpaAlvoBreakeven != null
      ? decimalNum(oferta.cpaAlvoBreakeven)
      : comissaoValor != null
        ? comissaoValor
        : null
  return {
    conversionPoint: oferta.conversionPoint,
    tipoProduto: oferta.tipoProduto,
    ltvEstimadoRebill: oferta.ltvEstimadoRebill != null ? decimalNum(oferta.ltvEstimadoRebill) : null,
    scoreOrigem: oferta.scoreCalculado,
    comissaoValor,
    budgetTesteAlocado: oferta.budgetTesteAlocado != null ? decimalNum(oferta.budgetTesteAlocado) : null,
    cpaAlvoBreakeven: cpaAlvo,
    cpaAlvoManual: oferta.cpaAlvoBreakeven != null,
    margemDesejadaPct: 100,
    criterioPausa: oferta.criterioPausa,
    criterioEscala: oferta.criterioEscala,
    statusOperacional: "TESTANDO" as const,
    domainUsed: oferta.domainUsed,
    nextReviewAt: oferta.nextReviewAt,
    moeda: "USD",
  }
}

export function calcularCpaAlvoBreakeven(input: {
  comissaoValor: number | null
  margemDesejadaPct: number | null
  cpaAlvoManual: boolean
  cpaAlvoBreakeven: number | null
}): number | null {
  if (input.cpaAlvoManual) return input.cpaAlvoBreakeven
  if (input.comissaoValor == null) return input.cpaAlvoBreakeven
  const margem = input.margemDesejadaPct && input.margemDesejadaPct > 0 ? input.margemDesejadaPct : 100
  return input.comissaoValor / (margem / 100)
}

export function serializeProdutoOperacional<
  T extends {
    preco: Dec
    comissaoPercent: Dec
    ltvEstimadoRebill?: Dec
    comissaoValor?: Dec
    budgetTesteAlocado?: Dec
    cpaAlvoBreakeven?: Dec
    margemDesejadaPct?: Dec
    gastoTotalAcumulado?: Dec
    receitaConfirmadaAcumulada?: Dec
    roiReal?: Dec
    cpaReal?: Dec
    statusOperacional?: string | null
  },
>(p: T) {
  const gasto = n(p.gastoTotalAcumulado)
  const budget = n(p.budgetTesteAlocado)
  const pct = budget && budget > 0 && gasto != null ? gasto / budget : null

  return {
    ...p,
    preco: n(p.preco),
    comissaoPercent: n(p.comissaoPercent),
    ltvEstimadoRebill: n(p.ltvEstimadoRebill),
    comissaoValor: n(p.comissaoValor),
    budgetTesteAlocado: budget,
    cpaAlvoBreakeven: n(p.cpaAlvoBreakeven),
    margemDesejadaPct: n(p.margemDesejadaPct),
    gastoTotalAcumulado: gasto,
    receitaConfirmadaAcumulada: n(p.receitaConfirmadaAcumulada),
    roiReal: n(p.roiReal),
    cpaReal: n(p.cpaReal),
    percentualBudgetConsumido: pct,
    alertaOrcamentoEstourado: alertaOrcamentoEstourado({
      gasto: p.gastoTotalAcumulado,
      budget: p.budgetTesteAlocado,
      statusOperacional: p.statusOperacional,
    }),
  }
}

export type ViabilidadeProduto = {
  porStatus: Record<string, number>
  falhaExecucao: number
  falhaMercado: number
}

/**
 * Viabilidade do Produto (ticket 09, D8) — projeção calculada em runtime
 * sobre `Campanha[].status`/`motivoEncerramento`, nunca coluna própria.
 * `ProdutoAfiliado.statusOperacional` está deprecado e não alimenta mais
 * esta leitura.
 */
export function computeViabilidadeProduto(
  campanhas: Array<{ status: string; motivoEncerramento?: string | null }>,
): ViabilidadeProduto {
  const porStatus: Record<string, number> = {}
  let falhaExecucao = 0
  let falhaMercado = 0

  for (const c of campanhas) {
    porStatus[c.status] = (porStatus[c.status] ?? 0) + 1
    if (c.status === "ENCERRADO") {
      if (c.motivoEncerramento === "FALHA_EXECUCAO") falhaExecucao++
      else if (c.motivoEncerramento === "FALHA_MERCADO") falhaMercado++
    }
  }

  return { porStatus, falhaExecucao, falhaMercado }
}

export { computeProdutoRollups }
