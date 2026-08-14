import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"

const TZ = "America/Sao_Paulo"
const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function currentPeriodo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now)
  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  return `${year}-${month}`
}

export function previousPeriodo(periodo: string): string | null {
  if (!PERIODO_RE.test(periodo)) return null
  const [y, m] = periodo.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 2, 1))
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export type OrcamentoPeriodoDTO = {
  id: string
  periodo: string
  capitalTotalDisponivel: number
  moedaBase: string
  limitePctPorProduto: number | null
  reservaMinimaPct: number
}

/**
 * Garante uma linha para o período corrente: copia capital/guardrails do mês
 * anterior (sem gasto) ou seed a partir de PortfolioConfig.
 */
export async function ensureOrcamentoPeriodo(periodo: string = currentPeriodo()): Promise<OrcamentoPeriodoDTO | null> {
  const existing = await db.orcamentoPeriodo.findUnique({ where: { periodo } })
  if (existing) return serialize(existing)

  const prevKey = previousPeriodo(periodo)
  const prev = prevKey ? await db.orcamentoPeriodo.findUnique({ where: { periodo: prevKey } }) : null
  if (prev) {
    const created = await db.orcamentoPeriodo.create({
      data: {
        periodo,
        capitalTotalDisponivel: prev.capitalTotalDisponivel,
        moedaBase: prev.moedaBase,
        limitePctPorProduto: prev.limitePctPorProduto,
        reservaMinimaPct: prev.reservaMinimaPct,
      },
    })
    return serialize(created)
  }

  const config = await db.portfolioConfig.findUnique({ where: { id: "default" } })
  if (config && decimalNum(config.totalAvailableCapital) > 0) {
    const created = await db.orcamentoPeriodo.create({
      data: {
        periodo,
        capitalTotalDisponivel: config.totalAvailableCapital,
        moedaBase: config.currency || "USD",
        reservaMinimaPct: 0,
      },
    })
    return serialize(created)
  }

  return null
}

function serialize(row: {
  id: string
  periodo: string
  capitalTotalDisponivel: { toString(): string } | number
  moedaBase: string
  limitePctPorProduto: { toString(): string } | number | null
  reservaMinimaPct: { toString(): string } | number
}): OrcamentoPeriodoDTO {
  return {
    id: row.id,
    periodo: row.periodo,
    capitalTotalDisponivel: decimalNum(row.capitalTotalDisponivel),
    moedaBase: row.moedaBase,
    limitePctPorProduto: row.limitePctPorProduto != null ? decimalNum(row.limitePctPorProduto) : null,
    reservaMinimaPct: decimalNum(row.reservaMinimaPct),
  }
}

export type BudgetGuardrailError = { status: 422; error: string }

export async function assertBudgetGuardrails(input: {
  produtoId: string
  newBudget: number
}): Promise<BudgetGuardrailError | null> {
  const orc = await ensureOrcamentoPeriodo()
  if (!orc) return null

  if (orc.limitePctPorProduto != null) {
    const teto = orc.capitalTotalDisponivel * (orc.limitePctPorProduto / 100)
    if (input.newBudget > teto) {
      return {
        status: 422,
        error: `Budget ultrapassa o teto de ${orc.limitePctPorProduto}% do capital do período (${teto.toFixed(2)} ${orc.moedaBase})`,
      }
    }
  }

  const ativos = await db.produtoAfiliado.findMany({
    where: { statusOperacional: { in: ["TESTANDO", "ESCALANDO"] } },
    select: { id: true, budgetTesteAlocado: true },
  })
  const somaOutros = ativos
    .filter((p) => p.id !== input.produtoId)
    .reduce((acc, p) => acc + decimalNum(p.budgetTesteAlocado), 0)
  const novaSoma = somaOutros + input.newBudget
  const tetoAlocavel = orc.capitalTotalDisponivel * (1 - orc.reservaMinimaPct / 100)
  if (novaSoma > tetoAlocavel + 1e-9) {
    return {
      status: 422,
      error: `Alocação ultrapassa a reserva mínima de ${orc.reservaMinimaPct}% (teto alocável ${tetoAlocavel.toFixed(2)} ${orc.moedaBase})`,
    }
  }

  return null
}
