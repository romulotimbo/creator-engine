"use client"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"

type SegPoint = { date: string } & Record<string, number | string>
type Pilar = { pilar: string; count: number }

const COLORS = ["var(--accent)", "var(--success)", "var(--cyan)", "var(--warning)", "var(--danger)", "oklch(0.68 0.2 350)", "var(--cyan)"]
const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }
const title: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 16 }
const empty: React.CSSProperties = { color: "var(--faint)", fontSize: 13, textAlign: "center", padding: "48px 0" }
const tip = { background: "var(--border)", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--foreground)", fontSize: 12 }

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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" />
              <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" width={48} />
              <Tooltip contentStyle={tip} labelStyle={{ color: "var(--muted-foreground)" }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" />
              <YAxis type="category" dataKey="pilar" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} stroke="var(--border-strong)" width={80} />
              <Tooltip contentStyle={tip} labelStyle={{ color: "var(--muted-foreground)" }} cursor={{ fill: "color-mix(in oklch, var(--foreground) 3%, transparent)" }} />
              <Bar dataKey="count" name="Posts" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
