"use client"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"

type SegPoint = { date: string } & Record<string, number | string>
type Pilar = { pilar: string; count: number }

const COLORS = ["#7c3aed", "#34d399", "#60a5fa", "#f59e0b", "#f87171", "#f472b6", "#22d3ee"]
const card: React.CSSProperties = { background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }
const title: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }
const empty: React.CSSProperties = { color: "#7d899c", fontSize: 13, textAlign: "center", padding: "48px 0" }
const tip = { background: "#1e1e2e", border: "1px solid #2d2d3f", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }

export default function AnalyticsCharts({
  seguidoresSeries, personas, pilares,
}: {
  seguidoresSeries: SegPoint[]; personas: string[]; pilares: Pilar[]
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
      <div style={card}>
        <h2 style={title}>Crescimento de seguidores por persona</h2>
        {seguidoresSeries.length === 0 ? (
          <p style={empty}>Sem métricas registradas.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={seguidoresSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#7d899c", fontSize: 11 }} stroke="#2d2d3f" />
              <YAxis tick={{ fill: "#7d899c", fontSize: 11 }} stroke="#2d2d3f" width={48} />
              <Tooltip contentStyle={tip} labelStyle={{ color: "#94a3b8" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {personas.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} name={`@${p}`} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={card}>
        <h2 style={title}>Ranking de pilares (posts)</h2>
        {pilares.length === 0 ? (
          <p style={empty}>Sem posts.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pilares} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#7d899c", fontSize: 11 }} stroke="#2d2d3f" />
              <YAxis type="category" dataKey="pilar" tick={{ fill: "#94a3b8", fontSize: 12 }} stroke="#2d2d3f" width={80} />
              <Tooltip contentStyle={tip} labelStyle={{ color: "#94a3b8" }} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="count" name="Posts" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
