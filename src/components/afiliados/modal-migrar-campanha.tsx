"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"
import { Rocket, AlertCircle } from "lucide-react"

interface ContaTrafegoOption {
  id: string
  nome: string
  plataforma: string
  slug: string
}

export function ModalMigrarCampanha({
  ofertaId,
  ofertaNome,
  comissaoValor,
  onSuccess,
  onClose,
}: {
  ofertaId: string
  ofertaNome: string
  comissaoValor: number | null
  onSuccess: () => void
  onClose: () => void
}) {
  const [contas, setContas] = useState<ContaTrafegoOption[]>([])
  const [contaId, setContaId] = useState("")
  const [preco, setPreco] = useState<string>(comissaoValor ? String(comissaoValor) : "")
  const [comissaoPercent, setComissaoPercent] = useState<string>("")
  const [linkCheckout, setLinkCheckout] = useState("")
  const [linkLanding, setLinkLanding] = useState("")
  const [linkTracking, setLinkTracking] = useState("")
  const [justificativa, setJustificativa] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(apiUrl("/api/afiliados"))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContas(data)
          if (data.length > 0) setContaId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  async function handleMigrar() {
    if (!contaId) {
      setError("Selecione uma conta de tráfego de destino.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(apiUrl(`/api/afiliados/radar/${ofertaId}/migrar-campanha`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contaTrafegoId: contaId,
          preco: preco ? parseFloat(preco) : null,
          comissaoPercent: comissaoPercent ? parseFloat(comissaoPercent) : null,
          linkCheckout,
          linkLanding,
          linkTracking,
          justificativa: justificativa.trim() || `Aprovado no Radar para teste na conta selecionada`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Falha ao migrar oferta para a conta de tráfego")
      }

      onSuccess()
    } catch (err: unknown) {
      setError((err as Error).message || "Erro inesperado ao criar campanha")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
            <Rocket size={20} />
            Go! Criar Campanha de Tráfego
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 20 }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: "var(--space-md)" }}>
          Aprovar a oferta <strong>{ofertaNome}</strong> e gerar automaticamente o registro em <code>ProdutoAfiliado</code> e vínculo com a <code>ContaTrafego</code>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: "var(--space-md)" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Conta de Tráfego de Destino *
            </label>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-raised)",
                color: "var(--foreground)",
                fontSize: 13,
              }}
            >
              {contas.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.plataforma})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Preço / Valor ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Ex: 150.00"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-raised)",
                  color: "var(--foreground)",
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Comissão (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={comissaoPercent}
                onChange={(e) => setComissaoPercent(e.target.value)}
                placeholder="Ex: 75.0"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-raised)",
                  color: "var(--foreground)",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Link de Tracking / SubID
            </label>
            <input
              type="text"
              value={linkTracking}
              onChange={(e) => setLinkTracking(e.target.value)}
              placeholder="https://hop.clickbank.net/?aff=myid&tid=..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-raised)",
                color: "var(--foreground)",
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Justificativa da Decisão (DecisionLog)
            </label>
            <input
              type="text"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: EPC sustentado e baixo refund nos últimos 60d"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-raised)",
                color: "var(--foreground)",
                fontSize: 13,
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              marginBottom: "var(--space-md)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleMigrar} disabled={loading || !contaId}>
            {loading ? "Criando..." : "Confirmar & Criar Campanha"}
          </Button>
        </div>
      </div>
    </div>
  )
}
