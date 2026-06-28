import { db } from "@/lib/db"
import DashboardStats from "@/components/dashboard/stats"
import PersonasTable from "@/components/dashboard/personas-table"
import { CommandCenterHeader, CommandSectionHeader } from "@/components/dashboard/command-center-header"

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
      <CommandCenterHeader
        sector="OPS-00"
        title="Central de Comando"
        telemetry={{
          personas: personas.length,
          ativas: personas.filter(p => p.status === "ATIVA").length,
          postsPublicados: postsPorStatus["PUBLICADO"] ?? 0,
          postsPendentes: postsPorStatus["PENDENTE"] ?? 0,
        }}
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
        <CommandSectionHeader code="PF-REG" title="Registro de Personas" />
        <PersonasTable personas={personas} />
      </section>
    </div>
  )
}
