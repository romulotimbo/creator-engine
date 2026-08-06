"use client"

import { useEffect, useState } from "react"
import { Surface, Badge } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"
import { STATUS_DECISAO_LABELS } from "@/lib/afiliados"
import { Wallet, PiggyBank, Settings2 } from "lucide-react"

interface CapitalAllocationItem {
  ofertaId: string
  nome: string
  statusDecisao: string
  budgetTesteAlocado: number
}

interface CapitalAllocation {
  totalAvailableCapital: number
  totalAllocated: number
  totalFree: number
  currency: string
  allocations: CapitalAllocationItem[]
}

function formatMoney(value: number, currency: string) {
  return value.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 2 })
}

/**
 * Widget agregado de alocação de capital (capital-allocation-panel).
 * Vive no nível do módulo (página do Radar) — nunca embutido na tela
 * de uma oferta individual.
 */
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
  const totalFree = data?.totalFree ?? 0
  const allocations = data?.allocations ?? []
  const overAllocated = totalFree < 0

  return (
    <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
          <Wallet size={16} /> Alocação de Capital do Portfólio
        </div>
        {onConfigure && (
          <button
            type="button"
            onClick={onConfigure}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 12 }}
          >
            <Settings2 size={13} /> Configurar capital
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-md)", marginBottom: allocations.length ? "var(--space-sm)" : 0 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
            <PiggyBank size={13} /> Capital Disponível
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            {formatMoney(totalAvailable, currency)}
          </p>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Alocado (Testes Ativos)</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
            {formatMoney(totalAllocated, currency)}
          </p>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Livre</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: overAllocated ? "var(--danger)" : "var(--success)", margin: 0 }}>
            {formatMoney(totalFree, currency)}
          </p>
        </div>
      </div>

      {allocations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: "var(--space-sm)", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-sm)" }}>
          {allocations.map((a) => (
            <div key={a.ofertaId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--foreground)" }}>{a.nome}</span>
                <Badge variant="outline" style={{ fontSize: 9, padding: "1px 4px" }}>
                  {STATUS_DECISAO_LABELS[a.statusDecisao] || a.statusDecisao}
                </Badge>
              </div>
              <span style={{ color: "var(--muted-foreground)" }}>{formatMoney(a.budgetTesteAlocado, currency)}</span>
            </div>
          ))}
        </div>
      )}

      {!data?.totalAvailableCapital && (
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: "var(--space-sm)", marginBottom: 0 }}>
          Capital total do portfólio ainda não configurado.
        </p>
      )}
    </Surface>
  )
}
