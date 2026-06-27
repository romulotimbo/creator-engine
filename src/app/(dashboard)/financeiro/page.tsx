import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import FinanceiroActions from "./FinanceiroActions"

export default async function FinanceiroPage() {
  const [personas, receitas, custos] = await Promise.all([
    db.persona.findMany({ select: { id: true, slug: true, nomeArtistico: true } }),
    db.receita.findMany({ orderBy: { data: "desc" }, take: 50, include: { persona: { select: { slug: true } } } }),
    db.custo.findMany({ orderBy: { data: "desc" }, take: 50, include: { persona: { select: { slug: true } } } }),
  ])

  const receitaTotal = receitas.reduce((s, r) => s + Number(r.valor), 0)
  const custoTotal = custos.reduce((s, c) => s + Number(c.valor), 0)
  const lucro = receitaTotal - custoTotal

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Financeiro</h1>
          <p style={{ color: "#7d899c", fontSize: 14 }}>Receitas, custos e ROI global</p>
        </div>
        <FinanceiroActions personas={personas} />
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Receita Total", value: formatCurrency(receitaTotal), color: "#34d399" },
          { label: "Custo Total", value: formatCurrency(custoTotal), color: "#f87171" },
          { label: "Lucro Liquido", value: formatCurrency(lucro), color: lucro >= 0 ? "#34d399" : "#f87171" },
        ].map(s => (
          <div key={s.label} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <p style={{ color: "#7d899c", fontSize: 12, marginBottom: 8 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 28, fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Per persona */}
      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Por Persona</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["Persona","Receita","Custo","Lucro"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#7d899c", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personas.map(p => {
              const r = receitas.filter(x => x.personaId === p.id).reduce((s, x) => s + Number(x.valor), 0)
              const c = custos.filter(x => x.personaId === p.id).reduce((s, x) => s + Number(x.valor), 0)
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
                  <td style={{ padding: "10px 12px", color: "#e2e8f0" }}>@{p.slug}</td>
                  <td style={{ padding: "10px 12px", color: "#34d399" }}>{formatCurrency(r)}</td>
                  <td style={{ padding: "10px 12px", color: "#f87171" }}>{formatCurrency(c)}</td>
                  <td style={{ padding: "10px 12px", color: r - c >= 0 ? "#34d399" : "#f87171", fontWeight: 600 }}>{formatCurrency(r - c)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Recent transactions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Receitas Recentes</h2>
          {receitas.slice(0, 10).map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1e2e" }}>
              <div>
                <p style={{ color: "#e2e8f0", fontSize: 13 }}>{r.canal}</p>
                <p style={{ color: "#7d899c", fontSize: 11 }}>{r.persona.slug} · {formatDate(r.data)}</p>
              </div>
              <p style={{ color: "#34d399", fontWeight: 600 }}>{formatCurrency(Number(r.valor))}</p>
            </div>
          ))}
          {receitas.length === 0 && <p style={{ color: "#7d899c" }}>Sem receitas</p>}
        </div>
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Custos Recentes</h2>
          {custos.slice(0, 10).map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1e2e" }}>
              <div>
                <p style={{ color: "#e2e8f0", fontSize: 13 }}>{c.categoria} {c.ferramenta ? `· ${c.ferramenta}` : ""}</p>
                <p style={{ color: "#7d899c", fontSize: 11 }}>{c.persona?.slug ?? "global"} · {formatDate(c.data)}</p>
              </div>
              <p style={{ color: "#f87171", fontWeight: 600 }}>{formatCurrency(Number(c.valor))}</p>
            </div>
          ))}
          {custos.length === 0 && <p style={{ color: "#7d899c" }}>Sem custos</p>}
        </div>
      </div>
    </div>
  )
}
