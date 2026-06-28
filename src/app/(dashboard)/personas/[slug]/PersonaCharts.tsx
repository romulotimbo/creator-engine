"use client"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { PLATAFORMA_LABELS } from "@/lib/utils"

type SeguidoresPoint = { date: string } & Record<string, number | string>
type FinPoint = { mes: string; receita: number; custo: number }

const LINE_COLORS = ["var(--accent)", "var(--success)", "var(--cyan)", "var(--warning)", "var(--danger)"]

const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24,
}
const title: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 16 }
const empty: React.CSSProperties = { color: "var(--faint)", fontSize: 13, textAlign: "center", padding: "48px 0" }

const tooltipStyle = {
  background: "var(--border)", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--foreground)", fontSize: 12,
}

export default function PersonaCharts({
  seguidoresSeries, plataformas, finSeries,
}: {
  seguidoresSeries: SeguidoresPoint[]
  plataformas: string[]
  finSeries: FinPoint[]
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
      <div style={card}>
        <h2 style={title}>Crescimento de seguidores</h2>
        {seguidoresSeries.length === 0 ? (
          <p style={empty}>Sem métricas registradas ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={seguidoresSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" />
              <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" width={48} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--muted-foreground)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {plataformas.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} name={PLATAFORMA_LABELS[p] || p}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={card}>
        <h2 style={title}>Receita × Custo por mês</h2>
        {finSeries.length === 0 ? (
          <p style={empty}>Sem receitas ou custos lançados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={finSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" />
              <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" width={48} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita" fill="var(--success)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="custo" name="Custo" fill="var(--danger)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
