import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import FinanceiroActions from "./FinanceiroActions"
import { PageHeader } from "@/components/ui/primitives"

export default async function FinanceiroPage() {
  const [personas, receitas, custos, ferramentasAtivas] = await Promise.all([
    db.persona.findMany({ select: { id: true, slug: true, nomeArtistico: true } }),
    db.receita.findMany({ orderBy: { data: "desc" }, take: 50, include: { persona: { select: { slug: true } } } }),
    db.custo.findMany({ orderBy: { data: "desc" }, take: 50, include: { persona: { select: { slug: true } } } }),
    db.ferramenta.findMany({ where: { statusAssinatura: { in: ["ATIVA", "TRIAL"] } }, select: { custoMensal: true } }),
  ])

  const custoFerramentas = ferramentasAtivas.reduce((s, f) => s + Number(f.custoMensal ?? 0), 0)
  const receitaTotal = receitas.reduce((s, r) => s + Number(r.valor), 0)
  const custoTotal = custos.reduce((s, c) => s + Number(c.valor), 0) + custoFerramentas
  const lucro = receitaTotal - custoTotal

  return (
    <div>
      <PageHeader
        kicker="PersonaForge"
        title="Financeiro"
        description="Receitas, custos e ROI global"
        actions={<FinanceiroActions personas={personas} />}
      />

      <div className="ce-stats-grid ce-animate-in" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-md)", marginBottom: "var(--space-2xl)" }}>
        {[
          { label: "Receita Total", value: formatCurrency(receitaTotal), color: "var(--success)" },
          { label: "Custo Total", value: formatCurrency(custoTotal), color: "var(--danger)" },
          { label: "Assinaturas ferramentas", value: formatCurrency(custoFerramentas), color: "var(--warning)" },
          { label: "Lucro Liquido", value: formatCurrency(lucro), color: lucro >= 0 ? "var(--success)" : "var(--danger)" },
        ].map(s => (
          <div key={s.label} className="ce-stat-strip">
            <p className="ce-kicker">{s.label}</p>
            <p
              className={`ce-stat-value${s.label === "Lucro Liquido" ? " phosphor-glow" : ""}`}
              style={{ color: s.color, fontSize: "var(--text-xl)" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Per persona */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 16 }}>Por Persona</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Persona","Receita","Custo","Lucro"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--faint)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personas.map(p => {
              const r = receitas.filter(x => x.personaId === p.id).reduce((s, x) => s + Number(x.valor), 0)
              const c = custos.filter(x => x.personaId === p.id).reduce((s, x) => s + Number(x.valor), 0)
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--foreground)" }}>@{p.slug}</td>
                  <td style={{ padding: "10px 12px", color: "var(--success)" }}>{formatCurrency(r)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--danger)" }}>{formatCurrency(c)}</td>
                  <td style={{ padding: "10px 12px", color: r - c >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>{formatCurrency(r - c)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Recent transactions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 16 }}>Receitas Recentes</h2>
          {receitas.slice(0, 10).map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <p style={{ color: "var(--foreground)", fontSize: 13 }}>{r.canal}</p>
                <p style={{ color: "var(--faint)", fontSize: 11 }}>{r.persona.slug} · {formatDate(r.data)}</p>
              </div>
              <p style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(Number(r.valor))}</p>
            </div>
          ))}
          {receitas.length === 0 && <p style={{ color: "var(--faint)" }}>Sem receitas</p>}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 16 }}>Custos Recentes</h2>
          {custos.slice(0, 10).map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <p style={{ color: "var(--foreground)", fontSize: 13 }}>{c.categoria} {c.ferramenta ? `· ${c.ferramenta}` : ""}</p>
                <p style={{ color: "var(--faint)", fontSize: 11 }}>{c.persona?.slug ?? "global"} · {formatDate(c.data)}</p>
              </div>
              <p style={{ color: "var(--danger)", fontWeight: 600 }}>{formatCurrency(Number(c.valor))}</p>
            </div>
          ))}
          {custos.length === 0 && <p style={{ color: "var(--faint)" }}>Sem custos</p>}
        </div>
      </div>
    </div>
  )
}
