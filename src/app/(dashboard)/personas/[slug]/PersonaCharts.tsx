"use client"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { PLATAFORMA_LABELS } from "@/lib/utils"

type SeguidoresPoint = { date: string } & Record<string, number | string>
type FinPoint = { mes: string; receita: number; custo: number }

const LINE_COLORS = ["#7c3aed", "#34d399", "#60a5fa", "#f59e0b", "#f87171"]

const card: React.CSSProperties = {
  background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24,
}
const title: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }
const empty: React.CSSProperties = { color: "#7d899c", fontSize: 13, textAlign: "center", padding: "48px 0" }

const tooltipStyle = {
  background: "#1e1e2e", border: "1px solid #2d2d3f", borderRadius: 8, color: "#e2e8f0", fontSize: 12,
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#7d899c", fontSize: 11 }} stroke="#2d2d3f" />
              <YAxis tick={{ fill: "#7d899c", fontSize: 11 }} stroke="#2d2d3f" width={48} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#94a3b8" }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="mes" tick={{ fill: "#7d899c", fontSize: 11 }} stroke="#2d2d3f" />
              <YAxis tick={{ fill: "#7d899c", fontSize: 11 }} stroke="#2d2d3f" width={48} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#94a3b8" }}
                formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="custo" name="Custo" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
