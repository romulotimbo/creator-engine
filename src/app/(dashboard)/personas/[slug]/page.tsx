import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import PersonaCharts from "./PersonaCharts"
import {
  PERSONA_STATUS_LABELS, PERSONA_STATUS_COLORS,
  PLATAFORMA_LABELS, formatCurrency, getProgressPercent
} from "@/lib/utils"

export default async function PersonaHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({
    where: { slug },
    include: {
      contas: true,
      _count: { select: { posts: true, receitas: true, imagens: true } },
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

  const navLinks = [
    { href: `/personas/${persona.slug}/roteiros`, label: "Roteiros" },
    { href: `/personas/${persona.slug}/calendario`, label: "Calendario" },
    { href: `/personas/${persona.slug}/plano`, label: "Plano" },
    { href: `/personas/${persona.slug}/funil`, label: "Funil" },
    { href: `/personas/${persona.slug}/imagens`, label: "Imagens" },
    { href: `/personas/${persona.slug}/credenciais`, label: "Credenciais" },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0" }}>@{persona.slug}</h1>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid", ...parseStyle(PERSONA_STATUS_COLORS[persona.status]) }}>
              {PERSONA_STATUS_LABELS[persona.status]}
            </span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>{persona.nicho}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}>
              <button style={{ padding: "8px 14px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                {l.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Receita", value: formatCurrency(receita) },
          { label: "Custo", value: formatCurrency(custo) },
          { label: "Lucro", value: formatCurrency(receita - custo) },
          { label: "Posts", value: String(persona._count.posts) },
        ].map(s => (
          <div key={s.label} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20 }}>
            <p style={{ color: "#7d899c", fontSize: 12, marginBottom: 4 }}>{s.label}</p>
            <p style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <PersonaCharts seguidoresSeries={seguidoresSeries} plataformas={plataformas} finSeries={finSeries} />

      {/* Contas */}
      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Contas</h2>
        {persona.contas.length === 0 ? (
          <p style={{ color: "#7d899c", fontSize: 14 }}>Nenhuma conta cadastrada</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {persona.contas.map(c => (
              <div key={c.id} style={{ background: "#1e1e2e", borderRadius: 8, padding: 16 }}>
                <p style={{ color: "#7d899c", fontSize: 11, marginBottom: 4 }}>{PLATAFORMA_LABELS[c.plataforma]}</p>
                <p style={{ color: "#e2e8f0", fontWeight: 600 }}>@{c.handle}</p>
                <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{c.seguidoresAtual.toLocaleString("pt-BR")} seguidores</p>
                {c.metaSeguidores && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ background: "#2d2d3f", borderRadius: 4, height: 4, overflow: "hidden" }}>
                      <div style={{ background: "#7c3aed", height: "100%", width: `${getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}%` }} />
                    </div>
                    <p style={{ color: "#7d899c", fontSize: 11, marginTop: 4 }}>
                      {getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}% da meta ({c.metaSeguidores.toLocaleString("pt-BR")})
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Persona Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Perfil da Persona</h2>
          {persona.aparencia && <Field label="Aparencia" value={persona.aparencia} />}
          {persona.personalidade && <Field label="Personalidade" value={persona.personalidade} />}
          {persona.incongruenciaCentral && <Field label="Incongruencia Central" value={persona.incongruenciaCentral} />}
        </div>
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Status dos Posts</h2>
          {["PENDENTE","APROVADO","AGENDADO","PUBLICADO","REJEITADO"].map(s => (
            <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1e2e" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{s}</span>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{postMap[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ color: "#7d899c", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{value}</p>
    </div>
  )
}

function parseStyle(classStr: string): React.CSSProperties {
  // Very minimal: extract color values from Tailwind-like strings
  if (classStr.includes("emerald")) return { color: "#34d399", borderColor: "#059669" }
  if (classStr.includes("blue")) return { color: "#60a5fa", borderColor: "#3b82f6" }
  if (classStr.includes("red")) return { color: "#f87171", borderColor: "#ef4444" }
  if (classStr.includes("yellow")) return { color: "#fbbf24", borderColor: "#f59e0b" }
  return { color: "#94a3b8", borderColor: "#6b7280" }
}
