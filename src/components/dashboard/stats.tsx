import { formatCurrency } from "@/lib/utils"
import { tk } from "@/lib/tokens"

type Props = {
  totalPersonas: number
  personasAtivas: number
  receitaTotal: number
  custoTotal: number
  postsPublicados: number
  postsPendentes: number
}

export default function DashboardStats({
  totalPersonas,
  personasAtivas,
  receitaTotal,
  custoTotal,
  postsPublicados,
  postsPendentes,
}: Props) {
  const lucro = receitaTotal - custoTotal

  return (
    <div
      className="ce-stats-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: "var(--space-md)",
      }}
    >
      <StatStrip
        className="ce-animate-in"
        accent
        label="Personas"
        value={String(totalPersonas)}
        sub={`${personasAtivas} ativas`}
        color={tk.accent}
        style={{ gridColumn: "span 4" }}
      />
      <StatStrip
        className="ce-animate-in"
        label="Posts publicados"
        value={String(postsPublicados)}
        sub={`${postsPendentes} pendentes`}
        color={tk.cyan}
        style={{ gridColumn: "span 4" }}
      />
      <StatStrip
        className="ce-animate-in"
        label="Lucro líquido"
        value={formatCurrency(lucro)}
        sub={lucro >= 0 ? "positivo" : "negativo"}
        color={lucro >= 0 ? tk.success : tk.danger}
        glow
        style={{ gridColumn: "span 4" }}
      />
      <StatStrip
        className="ce-animate-in"
        label="Receita"
        value={formatCurrency(receitaTotal)}
        sub="acumulado"
        color={tk.success}
        style={{ gridColumn: "span 5" }}
      />
      <StatStrip
        className="ce-animate-in"
        label="Custo"
        value={formatCurrency(custoTotal)}
        sub="acumulado"
        color={tk.danger}
        style={{ gridColumn: "span 7" }}
      />
    </div>
  )
}

function StatStrip({
  label,
  value,
  sub,
  color,
  accent,
  glow,
  className,
  style,
}: {
  label: string
  value: string
  sub: string
  color: string
  accent?: boolean
  glow?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`ce-stat-strip ce-instrument-panel ${className ?? ""}`} data-accent={accent ?? false} style={style}>
      <p className="ce-kicker">{label}</p>
      <p
        className={`ce-stat-value${glow ? " phosphor-glow" : ""}`}
        style={{ color }}
      >
        {value}
      </p>
      <p className="font-mono" style={{ color: tk.muted, fontSize: "var(--text-xs)" }}>
        {sub}
      </p>
    </div>
  )
}
