"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api-url"
import { formatDate } from "@/lib/utils"
import { Button, Select, Surface, EmptyState } from "@/components/ui/primitives"

type Item = {
  id: string
  fonte: string
  tipo: string
  googleAdsCustomerId: string | null
  nomeCampanhaGoogleAds: string | null
  linhaBruta: Record<string, unknown>
  createdAt: string
}

type CampanhaOpt = { id: string; label: string }

export default function NaoReconciliadosClient({
  itens,
  campanhas,
}: {
  itens: Item[]
  campanhas: CampanhaOpt[]
}) {
  const router = useRouter()
  const [selecionado, setSelecionado] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reconciliar(itemId: string) {
    const campanhaId = selecionado[itemId]
    if (!campanhaId) return
    setSaving(itemId)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/nao-reconciliados/${itemId}/reconciliar`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campanhaId }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(null)
    }
  }

  if (itens.length === 0) {
    return (
      <EmptyState>
        <p>Nenhuma linha pendente de reconciliação. 🎉</p>
      </EmptyState>
    )
  }

  return (
    <>
      {error && (
        <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}
      <Surface className="ce-data-table">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Recebido em", "Fonte", "Tipo", "Google Ads Customer ID", "Nome da campanha (Ads)", "Vincular a"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--muted-foreground)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDate(new Date(item.createdAt))}</td>
                <td style={{ padding: "10px 12px" }}>{item.fonte}</td>
                <td style={{ padding: "10px 12px" }}>{item.tipo}</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12 }}>{item.googleAdsCustomerId || "—"}</td>
                <td style={{ padding: "10px 12px" }}>{item.nomeCampanhaGoogleAds || "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Select
                      value={selecionado[item.id] || ""}
                      onChange={(e) => setSelecionado((s) => ({ ...s, [item.id]: e.target.value }))}
                      style={{ fontSize: 12, minWidth: 220 }}
                    >
                      <option value="">Selecionar campanha…</option>
                      {campanhas.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </Select>
                    <Button
                      variant="ghost"
                      disabled={!selecionado[item.id] || saving === item.id}
                      onClick={() => reconciliar(item.id)}
                    >
                      {saving === item.id ? "…" : "Vincular"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </>
  )
}
