import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import { alertaOrcamentoEstourado } from "./rollups"
import { currentPeriodo, ensureOrcamentoPeriodo } from "./orcamento"

const ACTIVE_OPERATIONAL = ["TESTANDO", "ESCALANDO"] as const

export interface CapitalAllocationItem {
  produtoId: string
  nome: string
  statusOperacional: string | null
  budgetTesteAlocado: number
  gastoTotalAcumulado: number
  alertaOrcamentoEstourado: boolean
}

export interface CapitalAllocationAlert {
  produtoId: string
  nome: string
  gasto: number
  budget: number
}

export interface CapitalAllocation {
  periodo: string
  totalAvailableCapital: number
  totalAllocated: number
  totalSpent: number
  totalFree: number
  pctConsumed: number | null
  currency: string
  allocations: CapitalAllocationItem[]
  alerts: CapitalAllocationAlert[]
}

/**
 * Widget agregado de alocação de capital.
 *
 * Capital vem de `OrcamentoPeriodo` do mês corrente (fallback PortfolioConfig).
 * Alocado/gasto vêm de `ProdutoAfiliado` em TESTANDO/ESCALANDO — ofertas sem
 * produto não entram.
 */
export async function getActiveCapitalAllocation(now: Date = new Date()): Promise<CapitalAllocation> {
  const periodo = currentPeriodo(now)
  const orc = await ensureOrcamentoPeriodo(periodo)

  const config = orc
    ? null
    : await db.portfolioConfig.findUnique({ where: { id: "default" } })

  const totalAvailableCapital = orc
    ? orc.capitalTotalDisponivel
    : config
      ? decimalNum(config.totalAvailableCapital)
      : 0
  const currency = orc?.moedaBase ?? config?.currency ?? "USD"

  const produtos = await db.produtoAfiliado.findMany({
    where: { statusOperacional: { in: [...ACTIVE_OPERATIONAL] } },
    select: {
      id: true,
      nome: true,
      statusOperacional: true,
      budgetTesteAlocado: true,
      gastoTotalAcumulado: true,
    },
    orderBy: { budgetTesteAlocado: "desc" },
  })

  const allocations: CapitalAllocationItem[] = produtos.map((p) => {
    const budget = decimalNum(p.budgetTesteAlocado)
    const gasto = decimalNum(p.gastoTotalAcumulado)
    return {
      produtoId: p.id,
      nome: p.nome,
      statusOperacional: p.statusOperacional,
      budgetTesteAlocado: budget,
      gastoTotalAcumulado: gasto,
      alertaOrcamentoEstourado: alertaOrcamentoEstourado({
        gasto: p.gastoTotalAcumulado,
        budget: p.budgetTesteAlocado,
        statusOperacional: p.statusOperacional,
      }),
    }
  })

  const totalAllocated = allocations.reduce((acc, a) => acc + a.budgetTesteAlocado, 0)
  const totalSpent = allocations.reduce((acc, a) => acc + a.gastoTotalAcumulado, 0)
  const totalFree = totalAvailableCapital - totalAllocated
  const pctConsumed = totalAvailableCapital > 0 ? totalSpent / totalAvailableCapital : null

  const alerts: CapitalAllocationAlert[] = allocations
    .filter((a) => a.alertaOrcamentoEstourado)
    .map((a) => ({
      produtoId: a.produtoId,
      nome: a.nome,
      gasto: a.gastoTotalAcumulado,
      budget: a.budgetTesteAlocado,
    }))

  return {
    periodo,
    totalAvailableCapital,
    totalAllocated,
    totalSpent,
    totalFree,
    pctConsumed,
    currency,
    allocations,
    alerts,
  }
}
