import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import { alertaOrcamentoEstourado } from "./rollups"
import { currentPeriodo, ensureOrcamentoPeriodo } from "./orcamento"
import { alvosComTetoDecidido } from "./fila"

const NO_AR = ["TESTANDO", "ESCALANDO"] as const

export interface CapitalAllocationItem {
  produtoId: string
  nome: string
  status: string
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

function campanhaNoAr(status: string) {
  return (NO_AR as readonly string[]).includes(status)
}

/**
 * Widget agregado de alocação de capital.
 *
 * Alocado: produtos ATIVO com campanha TESTANDO/ESCALANDO.
 * Gasto: inclui pausado/arquivado (fato histórico).
 * Alerta: conjunção em `alertaOrcamentoEstourado`.
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
    where: {
      OR: [
        { status: "ATIVO" },
        { gastoTotalAcumulado: { not: null } },
      ],
    },
    select: {
      id: true,
      nome: true,
      status: true,
      statusOperacional: true,
      budgetTesteAlocado: true,
      gastoTotalAcumulado: true,
      campanhas: { select: { id: true, status: true } },
    },
    orderBy: { budgetTesteAlocado: "desc" },
  })

  const campanhaIds = produtos.flatMap((p) => p.campanhas.map((c) => c.id))
  const tetoDecidido = await alvosComTetoDecidido(db, campanhaIds)

  const allocations: CapitalAllocationItem[] = []
  let totalAllocated = 0
  let totalSpent = 0

  for (const p of produtos) {
    const budget = decimalNum(p.budgetTesteAlocado)
    const gasto = decimalNum(p.gastoTotalAcumulado)
    const testando = p.campanhas.filter((c) => c.status === "TESTANDO")
    const noAr = p.campanhas.some((c) => campanhaNoAr(c.status))
    const ativoNoAr = p.status === "ATIVO" && noAr
    const pausadoComGasto = p.status !== "ATIVO" && gasto > 0
    const alerta = alertaOrcamentoEstourado({
      gasto: p.gastoTotalAcumulado,
      budget: p.budgetTesteAlocado,
      produtoStatus: p.status,
      temCampanhaTestando: testando.length > 0,
      tetoJaDecidido: testando.length > 0 && testando.every((c) => tetoDecidido.has(c.id)),
    })

    if (ativoNoAr) totalAllocated += budget
    if (gasto > 0) totalSpent += gasto

    if (ativoNoAr || pausadoComGasto) {
      allocations.push({
        produtoId: p.id,
        nome: p.nome,
        status: p.status,
        statusOperacional: p.statusOperacional,
        budgetTesteAlocado: budget,
        gastoTotalAcumulado: gasto,
        alertaOrcamentoEstourado: alerta,
      })
    }
  }

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
