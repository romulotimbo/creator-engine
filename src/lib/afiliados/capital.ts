import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"

const ACTIVE_STATUSES = ["APROVADO_TESTE", "EM_EXECUCAO"] as const

export interface CapitalAllocationItem {
  ofertaId: string
  nome: string
  statusDecisao: string
  budgetTesteAlocado: number
}

export interface CapitalAllocation {
  totalAvailableCapital: number
  totalAllocated: number
  totalFree: number
  currency: string
  allocations: CapitalAllocationItem[]
}

/**
 * Widget agregado de alocação de capital (capital-allocation-panel).
 *
 * `totalAvailableCapital` vem exclusivamente de `PortfolioConfig` (singleton
 * `id = "default"`) — nunca de campos por oferta. `totalAllocated` soma
 * `budgetTesteAlocado` das ofertas ativas (`APROVADO_TESTE`/`EM_EXECUCAO`),
 * tratando `null` como 0.
 */
export async function getActiveCapitalAllocation(): Promise<CapitalAllocation> {
  const [config, ofertasAtivas] = await Promise.all([
    db.portfolioConfig.findUnique({ where: { id: "default" } }),
    db.ofertaDecisao.findMany({
      where: { statusDecisao: { in: [...ACTIVE_STATUSES] } },
      select: { id: true, nome: true, statusDecisao: true, budgetTesteAlocado: true },
      orderBy: { budgetTesteAlocado: "desc" },
    }),
  ])

  const totalAvailableCapital = config ? decimalNum(config.totalAvailableCapital) : 0
  const currency = config?.currency ?? "USD"

  const allocations: CapitalAllocationItem[] = ofertasAtivas.map((o) => ({
    ofertaId: o.id,
    nome: o.nome,
    statusDecisao: o.statusDecisao,
    budgetTesteAlocado: decimalNum(o.budgetTesteAlocado),
  }))

  const totalAllocated = allocations.reduce((acc, a) => acc + a.budgetTesteAlocado, 0)
  const totalFree = totalAvailableCapital - totalAllocated

  return {
    totalAvailableCapital,
    totalAllocated,
    totalFree,
    currency,
    allocations,
  }
}
