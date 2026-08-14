"use client"

import { useEffect, useState } from "react"
import { Surface, Badge } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"
import { STATUS_OPERACIONAL_LABELS } from "@/lib/afiliados"
import { Wallet, PiggyBank, Settings2, AlertTriangle } from "lucide-react"

interface CapitalAllocationItem {
  produtoId: string
  nome: string
  statusOperacional: string | null
  budgetTesteAlocado: number
  gastoTotalAcumulado: number
  alertaOrcamentoEstourado: boolean
}

interface CapitalAllocationAlert {
  produtoId: string
  nome: string
  gasto: number
  budget: number
}

interface CapitalAllocation {
  periodo: string
  totalAvailableCapital: number
  totalAllocated: number
  totalSpent: number
  totalFree: number
  pctConsumed: number | null
  currency: string
  allocations: CapitalAllocationItem[]
  alerts: CapitalAllocationAlert[]
}

function formatMoney(value: number, currency: string) {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 2 })
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function CapitalAllocationWidget({ onConfigure }: { onConfigure?: () => void }) {
  const [data, setData] = useState<CapitalAllocation | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await fetch(apiUrl("/api/afiliados/capital-allocation"))
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Carregando alocação de capital…</span>
      </Surface>
    )
  }

  const currency = data?.currency || "USD"
  const totalAvailable = data?.totalAvailableCapital ?? 0
  const totalAllocated = data?.totalAllocated ?? 0
  const totalSpent = data?.totalSpent ?? 0
  const totalFree = data?.totalFree ?? 0
  const pct = data?.pctConsumed
  const allocations = data?.allocations ?? []
  const alerts = data?.alerts ?? []
  const overAllocated = totalFree < 0

  return (
    <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
          <Wallet size={16} /> Alocação de Capital {data?.periodo ? `· ${data.periodo}` : ""}
        </div>
        {onConfigure && (
          <button
            type="button"
            onClick={onConfigure}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 12 }}
          >
            <Settings2 size={13} /> Configurar orçamento
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-md)", marginBottom: allocations.length ? "var(--space-sm)" : 0 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
            <PiggyBank size={13} /> Capital disponível
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{formatMoney(totalAvailable, currency)}</p>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Alocado (planejado)</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", margin: 0 }}>{formatMoney(totalAllocated, currency)}</p>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Gasto (realizado)</div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{formatMoney(totalSpent, currency)}</p>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Livre</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: overAllocated ? "var(--danger)" : "var(--success)", margin: 0 }}>
            {formatMoney(totalFree, currency)}
          </p>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>% consumido</div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{pct != null ? `${(pct * 100).toFixed(1)}%` : "—"}</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "rgba(234,179,8,0.12)", fontSize: 12, color: "var(--warning)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
            <AlertTriangle size={13} /> Orçamento estourado sem decisão
          </div>
          {alerts.map((a) => (
            <div key={a.produtoId}>{a.nome}: gasto {formatMoney(a.gasto, currency)} &gt; budget {formatMoney(a.budget, currency)}</div>
          ))}
        </div>
      )}

      {allocations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: "var(--space-sm)", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-sm)" }}>
          {allocations.map((a) => (
            <div key={a.produtoId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{a.nome}</span>
                {a.statusOperacional && (
                  <Badge variant="outline" style={{ fontSize: 9, padding: "1px 4px" }}>
                    {STATUS_OPERACIONAL_LABELS[a.statusOperacional] || a.statusOperacional}
                  </Badge>
                )}
                {a.alertaOrcamentoEstourado && <AlertTriangle size={12} style={{ color: "var(--warning)" }} />}
              </div>
              <span style={{ color: "var(--muted-foreground)" }}>
                {formatMoney(a.gastoTotalAcumulado, currency)} / {formatMoney(a.budgetTesteAlocado, currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!data?.totalAvailableCapital && (
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: "var(--space-sm)", marginBottom: 0 }}>
          Capital do período ainda não configurado.
        </p>
      )}
    </Surface>
  )
}
