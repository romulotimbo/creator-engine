import { formatCurrency } from "@/lib/utils"

type Props = {
  totalPersonas: number
  personasAtivas: number
  receitaTotal: number
  custoTotal: number
  postsPublicados: number
  postsPendentes: number
}

export default function DashboardStats({ totalPersonas, personasAtivas, receitaTotal, custoTotal, postsPublicados, postsPendentes }: Props) {
  const lucro = receitaTotal - custoTotal
  const stats = [
    { label: "Total Personas", value: String(totalPersonas), sub: `${personasAtivas} ativas`, color: "#7c3aed" },
    { label: "Receita Total", value: formatCurrency(receitaTotal), sub: "acumulado", color: "#34d399" },
    { label: "Custo Total", value: formatCurrency(custoTotal), sub: "acumulado", color: "#f87171" },
    { label: "Lucro Liquido", value: formatCurrency(lucro), sub: lucro >= 0 ? "positivo" : "negativo", color: lucro >= 0 ? "#34d399" : "#f87171" },
    { label: "Posts Publicados", value: String(postsPublicados), sub: `${postsPendentes} pendentes`, color: "#60a5fa" },
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20 }}>
          <p style={{ color: "#7d899c", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{s.label}</p>
          <p style={{ color: s.color, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{s.value}</p>
          <p style={{ color: "#7d899c", fontSize: 11 }}>{s.sub}</p>
        </div>
      ))}
    </div>
  )
}
