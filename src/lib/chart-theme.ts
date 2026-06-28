import type { CSSProperties } from "react"

/** Paleta synthwave para Recharts — sem roxo-azul genérico */
export const CHART_COLORS = [
  "oklch(0.62 0.28 330)",
  "oklch(0.74 0.14 195)",
  "oklch(0.72 0.16 155)",
  "oklch(0.76 0.14 72)",
  "oklch(0.58 0.24 25)",
  "oklch(0.68 0.2 310)",
  "oklch(0.65 0.18 250)",
]

export const chartCard: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-xl)",
}

export const chartTitle: CSSProperties = {
  fontSize: "var(--text-base)",
  fontWeight: 600,
  color: "var(--foreground)",
  marginBottom: "var(--space-md)",
  fontFamily: "var(--font-display), system-ui, sans-serif",
}

export const chartTooltip = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius)",
  color: "var(--foreground)",
  fontSize: 12,
  fontFamily: "var(--font-mono), monospace",
}

export const chartGrid = { stroke: "var(--border)", strokeDasharray: "3 3" }
export const chartAxis = { fill: "var(--faint)", fontSize: 11 }
export const chartAxisStroke = "var(--border-strong)"
export const chartLabelStyle = { color: "var(--muted-foreground)" }
export const chartCursor = { fill: "color-mix(in oklch, var(--cyan) 6%, transparent)" }
