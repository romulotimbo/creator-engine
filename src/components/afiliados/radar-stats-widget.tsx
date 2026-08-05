"use client"

import { Surface } from "@/components/ui/primitives"
import { DollarSign, Target, TrendingUp, AlertTriangle } from "lucide-react"

interface RadarStatsWidgetProps {
  totalOfertas: number
  ofertasEmAnalise: number
  budgetTotalAlocado: number
  scoreMedio: number
  ofertasIncompletas: number
}

export function RadarStatsWidget({
  totalOfertas,
  ofertasEmAnalise,
  budgetTotalAlocado,
  scoreMedio,
  ofertasIncompletas,
}: RadarStatsWidgetProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
      }}
    >
      <Surface style={{ padding: "var(--space-sm) var(--space-md)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 12, marginBottom: 4 }}>
          <Target size={16} />
          <span>Ofertas no Radar</span>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
          {totalOfertas} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted-foreground)" }}>({ofertasEmAnalise} em análise)</span>
        </p>
      </Surface>

      <Surface style={{ padding: "var(--space-sm) var(--space-md)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 12, marginBottom: 4 }}>
          <DollarSign size={16} />
          <span>Budget Alocado (Testes)</span>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
          ${budgetTotalAlocado.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </Surface>

      <Surface style={{ padding: "var(--space-sm) var(--space-md)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 12, marginBottom: 4 }}>
          <TrendingUp size={16} />
          <span>Score Médio das Ofertas</span>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
          {scoreMedio.toFixed(1)} <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>/ 100</span>
        </p>
      </Surface>

      <Surface style={{ padding: "var(--space-sm) var(--space-md)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 12, marginBottom: 4 }}>
          <AlertTriangle size={16} />
          <span>Sem Dados Google Ads</span>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: ofertasIncompletas > 0 ? "var(--warning)" : "var(--foreground)", margin: 0 }}>
          {ofertasIncompletas} <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>ofertas parciais</span>
        </p>
      </Surface>
    </div>
  )
}
