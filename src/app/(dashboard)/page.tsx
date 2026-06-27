import { db } from "@/lib/db"
import DashboardStats from "@/components/dashboard/stats"
import PersonasTable from "@/components/dashboard/personas-table"

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
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Visao geral de todas as personas</p>
      </div>

      <DashboardStats
        totalPersonas={personas.length}
        personasAtivas={personas.filter(p => p.status === "ATIVA").length}
        receitaTotal={receitaTotal}
        custoTotal={custoTotal}
        postsPublicados={postsPorStatus["PUBLICADO"] ?? 0}
        postsPendentes={postsPorStatus["PENDENTE"] ?? 0}
      />

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Personas</h2>
        <PersonasTable personas={personas} />
      </div>
    </div>
  )
}
