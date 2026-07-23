import { db } from "@/lib/db"
import { format, differenceInCalendarDays } from "date-fns"
import { PILAR_LABELS, PLATAFORMA_LABELS, formatCurrency } from "@/lib/utils"
import AnalyticsCharts from "./AnalyticsCharts"
import PublicationHeatmap from "./PublicationHeatmap"
import { PageHeader } from "@/components/ui/primitives"

export default async function AnalyticsPage() {
  const personas = await db.persona.findMany({
    select: { id: true, slug: true, status: true, contas: { select: { id: true, plataforma: true } } },
  })
  const slugById = Object.fromEntries(personas.map((p) => [p.id, p.slug]))

  const [metricas, receitasGrp, custosGrp, pilaresGrp, ultimoPostGrp, ultimaMetricaGrp, publicados, comissoesAfiliados] = await Promise.all([
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
    db.vendaAfiliado.aggregate({
      where: {
        status: "APROVADA",
        data: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { valorComissao: true, valorVenda: true },
      _count: true,
    }).catch(() => ({ _sum: { valorComissao: null, valorVenda: null }, _count: 0 })),
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
      <PageHeader
        kicker="Creator Engine"
        title="Analytics Global"
        description="Comparativo de performance entre todas as personas"
        actions={
          <>
            <a href="/api/analytics/export?format=xlsx" className="ce-export-link">Export XLSX</a>
            <a href="/api/analytics/export?format=pdf" className="ce-export-link">Export PDF</a>
            <a href="/api/export/json" className="ce-export-link" data-muted="true">Snapshot JSON</a>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}>
        <AlertCard titulo="Personas sem publicar há 7+ dias" cor="var(--warning)"
          itens={alertasPost.map((a) => `@${a.slug}${a.dias === null ? " — nunca publicou" : ` — ${a.dias}d`}`)} vazio="Todas publicaram recentemente 🎉" />
        <AlertCard titulo="Contas sem métrica há 3+ dias" cor="var(--danger)"
          itens={alertasMetrica.map((a) => `@${a.slug} · ${a.plataforma}${a.dias === null ? " — sem métricas" : ` — ${a.dias}d`}`)} vazio="Métricas em dia 🎉" />
      </div>

      <div className="ce-surface ce-animate-in" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-xl)" }}>
        <h2 className="ce-section-title">Afiliados · comissões (mês corrente)</h2>
        <p style={{ color: "var(--faint)", fontSize: 13, marginBottom: "var(--space-md)" }}>
          Eixo separado de personas — dados de ContaTrafego / VendaAfiliado (lançamento manual).
        </p>
        {Number(comissoesAfiliados._count) === 0 ? (
          <p style={{ color: "var(--faint)", margin: 0 }}>Sem comissões aprovadas neste mês.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)" }}>
            <div>
              <p style={{ color: "var(--faint)", fontSize: 12, margin: 0 }}>Comissão aprovada</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: "var(--success)", margin: "4px 0 0" }}>
                {formatCurrency(Number(comissoesAfiliados._sum.valorComissao ?? 0))}
              </p>
            </div>
            <div>
              <p style={{ color: "var(--faint)", fontSize: 12, margin: 0 }}>Volume de vendas</p>
              <p style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 0" }}>
                {formatCurrency(Number(comissoesAfiliados._sum.valorVenda ?? 0))}
              </p>
            </div>
            <div>
              <p style={{ color: "var(--faint)", fontSize: 12, margin: 0 }}>Qtd. vendas</p>
              <p style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 0" }}>{comissoesAfiliados._count}</p>
            </div>
          </div>
        )}
      </div>

      {/* Gráficos */}
      <AnalyticsCharts seguidoresSeries={seguidoresSeries} personas={personasComMetrica} pilares={pilares} />

      <PublicationHeatmap grid={heatmap} max={heatMax} />

      {/* ROI */}
      <div className="ce-surface ce-data-table ce-animate-in" style={{ padding: "var(--space-xl)", marginTop: "var(--space-xl)" }}>
        <h2 className="ce-section-title">ROI por persona</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Persona", "Receita", "Custo", "ROI", "Lucro"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--faint)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roi.map((r) => (
              <tr key={r.slug} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px", color: "var(--foreground)" }}>@{r.slug}</td>
                <td style={{ padding: "10px 12px", color: "var(--success)" }}>{formatCurrency(r.receita)}</td>
                <td style={{ padding: "10px 12px", color: "var(--danger)" }}>{formatCurrency(r.custo)}</td>
                <td style={{ padding: "10px 12px", color: "var(--accent)", fontWeight: 600 }}>{r.roi === null ? "—" : `${r.roi.toFixed(2)}x`}</td>
                <td style={{ padding: "10px 12px", color: r.receita - r.custo >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>{formatCurrency(r.receita - r.custo)}</td>
              </tr>
            ))}
            {roi.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--faint)" }}>Sem personas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AlertCard({ titulo, cor, itens, vazio }: { titulo: string; cor: string; itens: string[]; vazio: string }) {
  const tone = cor.includes("warning") ? "warning" : cor.includes("danger") ? "danger" : undefined
  return (
    <div className="ce-alert-panel ce-animate-in" data-tone={tone} style={itens.length ? { borderColor: `color-mix(in oklch, ${cor} 35%, var(--border))` } : undefined}>
      <p className="ce-kicker" style={{ marginBottom: "var(--space-sm)" }}>{titulo}</p>
      {itens.length === 0 ? (
        <p style={{ color: "var(--success)", fontSize: 14 }}>{vazio}</p>
      ) : (
        itens.map((t, i) => <p key={i} style={{ color: cor, fontSize: 13, marginBottom: 4 }}>⚠ {t}</p>)
      )}
    </div>
  )
}
