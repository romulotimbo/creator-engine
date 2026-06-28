import { db } from "@/lib/db"
import DashboardStats from "@/components/dashboard/stats"
import PersonasTable from "@/components/dashboard/personas-table"
import { PageHeader } from "@/components/ui/primitives"

export default async function DashboardPage() {
  const [personas, receitasAgg, custosAgg, postsStats] = await Promise.all([
    db.persona.findMany({
      include: {
        contas: true,
        _count: { select: { posts: true, receitas: true } },
      },
      orderBy: { status: "asc" },
    }),
    db.receita.aggregate({ _sum: { valor: true } }),
    db.custo.aggregate({ _sum: { valor: true } }),
    db.post.groupBy({
      by: ["status"],
      _count: true,
    }),
  ])

  const receitaTotal = Number(receitasAgg._sum.valor ?? 0)
  const custoTotal = Number(custosAgg._sum.valor ?? 0)

  const postsPorStatus = postsStats.reduce((acc, g) => {
    acc[g.status] = g._count
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <PageHeader
        kicker="Visão geral"
        title="Dashboard"
        description="Operação e estratégia das suas personas — métricas, status e P&L num relance."
      />

      <DashboardStats
        totalPersonas={personas.length}
        personasAtivas={personas.filter(p => p.status === "ATIVA").length}
        receitaTotal={receitaTotal}
        custoTotal={custoTotal}
        postsPublicados={postsPorStatus["PUBLICADO"] ?? 0}
        postsPendentes={postsPorStatus["PENDENTE"] ?? 0}
      />

      <section className="ce-animate-in" style={{ marginTop: "var(--space-2xl)" }}>
        <p className="ce-kicker" style={{ marginBottom: "var(--space-sm)" }}>Operação</p>
        <h2
          className="font-display"
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            marginBottom: "var(--space-md)",
            color: "var(--foreground)",
          }}
        >
          Personas
        </h2>
        <PersonasTable personas={personas} />
      </section>
    </div>
  )
}
