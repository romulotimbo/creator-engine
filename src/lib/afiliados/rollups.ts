import type { PrismaClient } from "@prisma/client"
import { decimalNum } from "@/lib/afiliados"

export type RollupInputSnapshot = {
  gasto: number | { toString(): string } | null
  receitaConfirmada: number | { toString(): string } | null
  conversoes: number | { toString(): string } | null
  dataSnapshot: Date | string
}

export type CampanhaComSnapshots = {
  snapshots: RollupInputSnapshot[]
}

export type ProdutoRollups = {
  gastoTotalAcumulado: number | null
  receitaConfirmadaAcumulada: number | null
  roiReal: number | null
  cpaReal: number | null
  dataUltimaAtualizacaoDados: Date | null
  percentualBudgetConsumido: number | null
}

function num(v: number | { toString(): string } | null | undefined): number {
  if (v == null) return 0
  return decimalNum(v)
}

function latestSnapshot(snapshots: RollupInputSnapshot[]): RollupInputSnapshot | null {
  if (!snapshots.length) return null
  return [...snapshots].sort((a, b) => {
    const da = new Date(a.dataSnapshot).getTime()
    const db = new Date(b.dataSnapshot).getTime()
    return db - da
  })[0]
}

/**
 * Calcula rollups a partir do snapshot mais recente de cada campanha.
 * Não soma o histórico (CSV é tratado como acumulado até a data).
 */
export function computeProdutoRollups(
  campanhas: CampanhaComSnapshots[],
  budgetTesteAlocado?: number | { toString(): string } | null,
): ProdutoRollups {
  if (!campanhas.length) {
    return {
      gastoTotalAcumulado: null,
      receitaConfirmadaAcumulada: null,
      roiReal: null,
      cpaReal: null,
      dataUltimaAtualizacaoDados: null,
      percentualBudgetConsumido: null,
    }
  }

  const latests = campanhas.map((c) => latestSnapshot(c.snapshots)).filter(Boolean) as RollupInputSnapshot[]
  if (!latests.length) {
    return {
      gastoTotalAcumulado: null,
      receitaConfirmadaAcumulada: null,
      roiReal: null,
      cpaReal: null,
      dataUltimaAtualizacaoDados: null,
      percentualBudgetConsumido: null,
    }
  }

  const gasto = latests.reduce((acc, s) => acc + num(s.gasto), 0)
  const receita = latests.reduce((acc, s) => acc + num(s.receitaConfirmada), 0)
  const conversoes = latests.reduce((acc, s) => acc + num(s.conversoes), 0)
  const dates = latests.map((s) => new Date(s.dataSnapshot))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  const budget = budgetTesteAlocado != null ? num(budgetTesteAlocado) : 0

  return {
    gastoTotalAcumulado: gasto,
    receitaConfirmadaAcumulada: receita,
    roiReal: gasto > 0 ? (receita - gasto) / gasto : null,
    cpaReal: conversoes > 0 ? gasto / conversoes : null,
    dataUltimaAtualizacaoDados: maxDate,
    percentualBudgetConsumido: budget > 0 ? gasto / budget : null,
  }
}

export function alertaOrcamentoEstourado(input: {
  gasto: number | { toString(): string } | null | undefined
  budget: number | { toString(): string } | null | undefined
  statusOperacional: string | null | undefined
}): boolean {
  const gasto = num(input.gasto)
  const budget = input.budget != null ? num(input.budget) : 0
  if (!(budget > 0) || !(gasto > budget)) return false
  return input.statusOperacional === "TESTANDO"
}

export type CampanhaRollups = {
  gastoTotalAcumulado: number | null
  receitaConfirmadaAcumulada: number | null
  roiReal: number | null
  cpaReal: number | null
}

/**
 * Rollup próprio da Campanha (D4, design.md) — distinto do rollup de
 * ProdutoAfiliado. `gasto` é a SOMA de todos os snapshots da campanha — grão
 * diário (delta por dia), fiel ao GAQL e à materialização de calendário do
 * envelope de ingestão (D2: dia sem métrica = zero, revisão retroativa
 * atualiza o dia específico). Isso é deliberadamente diferente da leitura
 * "latest" usada pelo rollup de `ProdutoAfiliado` (que soma o snapshot mais
 * recente de cada campanha) — aquela convenção vem da entrada manual antiga
 * (`/campanhas/[id]/snapshots`, cumulativa-até-a-data) e permanece correta
 * para quem só usa entrada manual. Uma campanha não deve misturar as duas
 * vias (manual cumulativa + ingestão automática diária) — se misturar, a
 * soma aqui superestima o gasto.
 *
 * `receita` é a soma de comissões de vendas confirmadas atribuídas a esta
 * campanha — VendaAfiliado é a fonte de verdade de ROI, não
 * CampanhaSnapshot.receitaConfirmada (que permanece só auditoria/referência
 * do Ads).
 */
export function computeCampanhaRollups(
  snapshots: RollupInputSnapshot[],
  vendasAprovadas: Array<{ valorComissao: number | { toString(): string } }>,
): CampanhaRollups {
  if (!snapshots.length) {
    return { gastoTotalAcumulado: null, receitaConfirmadaAcumulada: null, roiReal: null, cpaReal: null }
  }

  const gasto = snapshots.reduce((acc, s) => acc + num(s.gasto), 0)
  const receita = vendasAprovadas.reduce((acc, v) => acc + num(v.valorComissao), 0)
  const numVendas = vendasAprovadas.length

  return {
    gastoTotalAcumulado: gasto,
    receitaConfirmadaAcumulada: receita,
    roiReal: gasto > 0 ? (receita - gasto) / gasto : null,
    cpaReal: numVendas > 0 ? gasto / numVendas : null,
  }
}

export async function recomputeCampanhaRollups(
  client: PrismaClient,
  campanhaId: string,
): Promise<CampanhaRollups> {
  const [campanha, vendasAprovadas] = await Promise.all([
    client.campanha.findUnique({
      where: { id: campanhaId },
      select: {
        snapshots: { select: { gasto: true, receitaConfirmada: true, conversoes: true, dataSnapshot: true } },
      },
    }),
    client.vendaAfiliado.findMany({
      where: { campanhaId, status: "APROVADA" },
      select: { valorComissao: true },
    }),
  ])

  const rollups = computeCampanhaRollups(campanha?.snapshots ?? [], vendasAprovadas)

  await client.campanha.update({
    where: { id: campanhaId },
    data: {
      gastoTotalAcumulado: rollups.gastoTotalAcumulado,
      receitaConfirmadaAcumulada: rollups.receitaConfirmadaAcumulada,
      roiReal: rollups.roiReal,
      cpaReal: rollups.cpaReal,
    },
  })

  return rollups
}

export async function recomputeProdutoRollups(
  client: PrismaClient,
  produtoId: string,
): Promise<ProdutoRollups> {
  const [campanhas, produto] = await Promise.all([
    client.campanha.findMany({
      where: { produtoId },
      select: {
        snapshots: {
          select: { gasto: true, receitaConfirmada: true, conversoes: true, dataSnapshot: true },
        },
      },
    }),
    client.produtoAfiliado.findUnique({
      where: { id: produtoId },
      select: { budgetTesteAlocado: true },
    }),
  ])

  const rollups = computeProdutoRollups(campanhas, produto?.budgetTesteAlocado ?? null)

  await client.produtoAfiliado.update({
    where: { id: produtoId },
    data: {
      gastoTotalAcumulado: rollups.gastoTotalAcumulado,
      receitaConfirmadaAcumulada: rollups.receitaConfirmadaAcumulada,
      roiReal: rollups.roiReal,
      cpaReal: rollups.cpaReal,
      dataUltimaAtualizacaoDados: rollups.dataUltimaAtualizacaoDados,
    },
  })

  return rollups
}
