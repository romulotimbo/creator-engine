import { db } from "@/lib/db"
import { format, differenceInCalendarDays } from "date-fns"
import { PILAR_LABELS, PLATAFORMA_LABELS, formatCurrency } from "@/lib/utils"
import AnalyticsCharts from "./AnalyticsCharts"
import PublicationHeatmap from "./PublicationHeatmap"

export default async function AnalyticsPage() {
  const personas = await db.persona.findMany({
    select: { id: true, slug: true, status: true, contas: { select: { id: true, plataforma: true } } },
  })
  const slugById = Object.fromEntries(personas.map((p) => [p.id, p.slug]))

  const [metricas, receitasGrp, custosGrp, pilaresGrp, ultimoPostGrp, ultimaMetricaGrp, publicados] = await Promise.all([
    db.metricaHistorica.findMany({
      include: { conta: { select: { personaId: true } } },
      orderBy: { data: "asc" },
    }),
    db.receita.groupBy({ by: ["personaId"], _sum: { valor: true } }),
    db.custo.groupBy({ by: ["personaId"], _sum: { valor: true } }),
    db.post.groupBy({ by: ["pilar"], _count: true }),
    db.post.groupBy({ by: ["personaId"], _max: { dataPublicacao: true } }),
    db.metricaHistorica.groupBy({ by: ["contaId"], _max: { data: true } }),
    db.post.findMany({ where: { status: "PUBLICADO", dataPublicacao: { not: null } }, select: { dataPublicacao: true } }),
  ])

  // 1) Série comparativa de seguidores por persona (soma das contas por data)
  const segMap: Record<string, any> = {}
  for (const m of metricas) {
    const slug = slugById[m.conta.personaId]
    if (!slug) continue
    const key = format(m.data, "dd/MM")
    segMap[key] ||= { date: key }
    segMap[key][slug] = (segMap[key][slug] || 0) + m.seguidores
  }
  const seguidoresSeries = Object.values(segMap)
  const personasComMetrica = [...new Set(metricas.map((m) => slugById[m.conta.personaId]).filter(Boolean))] as string[]

  // 2) ROI por persona
  const recById = Object.fromEntries(receitasGrp.map((r) => [r.personaId, Number(r._sum.valor ?? 0)]))
  const cusById = Object.fromEntries(custosGrp.filter((c) => c.personaId).map((c) => [c.personaId as string, Number(c._sum.valor ?? 0)]))
  const roi = personas.map((p) => {
    const receita = recById[p.id] || 0
    const custo = cusById[p.id] || 0
    return { slug: p.slug, receita, custo, roi: custo > 0 ? receita / custo : null }
  }).sort((a, b) => (b.roi ?? -1) - (a.roi ?? -1))

  // 3) Ranking de pilares
  const pilares = pilaresGrp
    .map((g) => ({ pilar: PILAR_LABELS[g.pilar]?.split(" ")[0] || g.pilar, count: g._count }))
    .sort((a, b) => b.count - a.count)

  // 4) Alertas
  const hoje = new Date()
  const ultimoPostById = Object.fromEntries(ultimoPostGrp.map((g) => [g.personaId, g._max.dataPublicacao]))
  const alertasPost = personas.map((p) => {
    const ult = ultimoPostById[p.id]
    const dias = ult ? differenceInCalendarDays(hoje, new Date(ult)) : null
    return { slug: p.slug, dias, semPublicar: dias === null || dias >= 7 }
  }).filter((a) => a.semPublicar)

  const ultMetricaByConta = Object.fromEntries(ultimaMetricaGrp.map((g) => [g.contaId, g._max.data]))
  const alertasMetrica: { slug: string; plataforma: string; dias: number | null }[] = []
  for (const p of personas) {
    for (const c of p.contas) {
      const ult = ultMetricaByConta[c.id]
      const dias = ult ? differenceInCalendarDays(hoje, new Date(ult)) : null
      if (dias === null || dias >= 3) alertasMetrica.push({ slug: p.slug, plataforma: PLATAFORMA_LABELS[c.plataforma], dias })
    }
  }

  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  let heatMax = 0
  for (const p of publicados) {
    if (!p.dataPublicacao) continue
    const d = new Date(p.dataPublicacao)
    heatmap[d.getDay()][d.getHours()]++
    heatMax = Math.max(heatMax, heatmap[d.getDay()][d.getHours()])
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Analytics Global</h1>
          <p style={{ color: "#7d899c", fontSize: 14 }}>Comparativo de performance entre todas as personas</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/api/analytics/export?format=xlsx" style={{ padding: "8px 14px", background: "transparent", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8, fontSize: 13, textDecoration: "none" }}>Export XLSX</a>
          <a href="/api/analytics/export?format=pdf" style={{ padding: "8px 14px", background: "transparent", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8, fontSize: 13, textDecoration: "none" }}>Export PDF</a>
          <a href="/api/export/json" style={{ padding: "8px 14px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 13, textDecoration: "none" }}>Snapshot JSON</a>
        </div>
      </div>

      {/* Alertas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <AlertCard titulo="Personas sem publicar há 7+ dias" cor="#f59e0b"
          itens={alertasPost.map((a) => `@${a.slug}${a.dias === null ? " — nunca publicou" : ` — ${a.dias}d`}`)} vazio="Todas publicaram recentemente 🎉" />
        <AlertCard titulo="Contas sem métrica há 3+ dias" cor="#f87171"
          itens={alertasMetrica.map((a) => `@${a.slug} · ${a.plataforma}${a.dias === null ? " — sem métricas" : ` — ${a.dias}d`}`)} vazio="Métricas em dia 🎉" />
      </div>

      {/* Gráficos */}
      <AnalyticsCharts seguidoresSeries={seguidoresSeries} personas={personasComMetrica} pilares={pilares} />

      <PublicationHeatmap grid={heatmap} max={heatMax} />

      {/* ROI */}
      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>ROI por persona</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["Persona", "Receita", "Custo", "ROI", "Lucro"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#7d899c", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roi.map((r) => (
              <tr key={r.slug} style={{ borderBottom: "1px solid #1e1e2e" }}>
                <td style={{ padding: "10px 12px", color: "#e2e8f0" }}>@{r.slug}</td>
                <td style={{ padding: "10px 12px", color: "#34d399" }}>{formatCurrency(r.receita)}</td>
                <td style={{ padding: "10px 12px", color: "#f87171" }}>{formatCurrency(r.custo)}</td>
                <td style={{ padding: "10px 12px", color: "#a78bfa", fontWeight: 600 }}>{r.roi === null ? "—" : `${r.roi.toFixed(2)}x`}</td>
                <td style={{ padding: "10px 12px", color: r.receita - r.custo >= 0 ? "#34d399" : "#f87171", fontWeight: 600 }}>{formatCurrency(r.receita - r.custo)}</td>
              </tr>
            ))}
            {roi.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#7d899c" }}>Sem personas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AlertCard({ titulo, cor, itens, vazio }: { titulo: string; cor: string; itens: string[]; vazio: string }) {
  return (
    <div style={{ background: "#111118", border: `1px solid ${itens.length ? cor + "55" : "#1e1e2e"}`, borderRadius: 12, padding: 20 }}>
      <p style={{ color: "#7d899c", fontSize: 12, marginBottom: 10 }}>{titulo}</p>
      {itens.length === 0 ? (
        <p style={{ color: "#34d399", fontSize: 14 }}>{vazio}</p>
      ) : (
        itens.map((t, i) => <p key={i} style={{ color: cor, fontSize: 13, marginBottom: 4 }}>⚠ {t}</p>)
      )}
    </div>
  )
}
