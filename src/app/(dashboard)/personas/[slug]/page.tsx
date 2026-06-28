import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import PersonaCharts from "./PersonaCharts"
import {
  PERSONA_STATUS_LABELS, personaStatusBadgeStyle,
  PLATAFORMA_LABELS, formatCurrency, getProgressPercent, formatDate
} from "@/lib/utils"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"
import { SectionTitle } from "@/components/ui/primitives"

export default async function PersonaHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({
    where: { slug },
    include: {
      contas: true,
      _count: { select: { posts: true, receitas: true, imagens: true } },
      statusHistorico: { orderBy: { data: "desc" }, take: 10 },
    },
  })
  if (!persona) notFound()

  const [receitaAgg, custoAgg, postsPorStatus, metricas, receitas, custos] = await Promise.all([
    db.receita.aggregate({ where: { personaId: persona.id }, _sum: { valor: true } }),
    db.custo.aggregate({ where: { personaId: persona.id }, _sum: { valor: true } }),
    db.post.groupBy({ by: ["status"], where: { personaId: persona.id }, _count: true }),
    db.metricaHistorica.findMany({
      where: { contaId: { in: persona.contas.map((c) => c.id) } },
      orderBy: { data: "asc" },
    }),
    db.receita.findMany({ where: { personaId: persona.id }, select: { valor: true, data: true } }),
    db.custo.findMany({ where: { personaId: persona.id }, select: { valor: true, data: true } }),
  ])

  const receita = Number(receitaAgg._sum.valor ?? 0)
  const custo = Number(custoAgg._sum.valor ?? 0)
  const postMap = postsPorStatus.reduce((a, g) => { a[g.status] = g._count; return a }, {} as Record<string, number>)

  // Série de seguidores: por data, uma coluna por plataforma
  const platByConta = Object.fromEntries(persona.contas.map((c) => [c.id, c.plataforma]))
  const plataformas = [...new Set(persona.contas.map((c) => c.plataforma))]
  const segMap: Record<string, any> = {}
  for (const m of metricas) {
    const key = format(m.data, "dd/MM")
    segMap[key] ||= { date: key }
    segMap[key][platByConta[m.contaId]] = m.seguidores
  }
  const seguidoresSeries = Object.values(segMap)

  // Série financeira: receita × custo por mês
  const finMap: Record<string, { mes: string; sort: string; receita: number; custo: number }> = {}
  const bucket = (d: Date) => {
    const k = format(d, "MM/yyyy")
    finMap[k] ||= { mes: k, sort: format(d, "yyyy-MM"), receita: 0, custo: 0 }
    return finMap[k]
  }
  for (const r of receitas) bucket(r.data).receita += Number(r.valor)
  for (const c of custos) bucket(c.data).custo += Number(c.valor)
  const finSeries = Object.values(finMap).sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ mes, receita, custo }) => ({ mes, receita, custo }))

  return (
    <div>
      <PersonaSectionHeader
        slug={persona.slug}
        title={`@${persona.slug}`}
        description={persona.nicho}
        activeSegment=""
        actions={
          <span style={personaStatusBadgeStyle(persona.status)}>
            {PERSONA_STATUS_LABELS[persona.status]}
          </span>
        }
      />

      <div className="ce-stats-grid ce-animate-in" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-md)", marginBottom: "var(--space-2xl)" }}>
        {[
          { label: "Receita", value: formatCurrency(receita) },
          { label: "Custo", value: formatCurrency(custo) },
          { label: "Lucro", value: formatCurrency(receita - custo) },
          { label: "Posts", value: String(persona._count.posts) },
        ].map(s => (
          <div key={s.label} className="ce-stat-strip">
            <p className="ce-kicker">{s.label}</p>
            <p className="ce-stat-value" style={{ fontSize: "var(--text-xl)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <PersonaCharts seguidoresSeries={seguidoresSeries} plataformas={plataformas} finSeries={finSeries} />

      {/* Contas */}
      <div className="ce-surface ce-animate-in" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-xl)" }}>
        <SectionTitle>Contas</SectionTitle>
        {persona.contas.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>Nenhuma conta cadastrada</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {persona.contas.map(c => (
              <div key={c.id} style={{ background: "var(--border)", borderRadius: 8, padding: 16 }}>
                <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 4 }}>{PLATAFORMA_LABELS[c.plataforma]}</p>
                <p style={{ color: "var(--foreground)", fontWeight: 600 }}>@{c.handle}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>{c.seguidoresAtual.toLocaleString("pt-BR")} seguidores</p>
                {c.metaSeguidores && (
                  <div style={{ marginTop: 8 }}>
                    <div className="ce-progress-track">
                      <div className="ce-progress-fill" style={{ width: `${getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}%` }} />
                    </div>
                    <p style={{ color: "var(--faint)", fontSize: 11, marginTop: 4 }}>
                      {getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}% da meta ({c.metaSeguidores.toLocaleString("pt-BR")})
                    </p>
                  </div>
                )}
                <Link href={`/personas/${persona.slug}/metricas`} style={{ display: "inline-block", marginTop: 10, color: "var(--accent)", fontSize: 12, textDecoration: "none" }}>
                  Ver métricas →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Persona Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="ce-surface" style={{ padding: "var(--space-xl)" }}>
          <SectionTitle>Perfil da Persona</SectionTitle>
          {persona.aparencia && <Field label="Aparencia" value={persona.aparencia} />}
          {persona.personalidade && <Field label="Personalidade" value={persona.personalidade} />}
          {persona.incongruenciaCentral && <Field label="Incongruencia Central" value={persona.incongruenciaCentral} />}
        </div>
        <div className="ce-surface" style={{ padding: "var(--space-xl)" }}>
          <SectionTitle>Status dos Posts</SectionTitle>
          {["PENDENTE","APROVADO","AGENDADO","PUBLICADO","REJEITADO"].map(s => (
            <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{s}</span>
              <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{postMap[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {persona.statusHistorico.length > 0 && (
        <div className="ce-surface ce-animate-in" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-xl)" }}>
          <SectionTitle>Histórico de Status</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {persona.statusHistorico.map((log) => (
              <div key={log.id} style={{ display: "flex", gap: 12, alignItems: "baseline", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--faint)", fontSize: 12, minWidth: 90 }}>{formatDate(log.data)}</span>
                <span style={personaStatusBadgeStyle(log.status)}>
                  {PERSONA_STATUS_LABELS[log.status]}
                </span>
                {log.motivo && <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{log.motivo}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="ce-kicker" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--foreground)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>{value}</p>
    </div>
  )
}
