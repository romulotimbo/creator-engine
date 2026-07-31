"use client"

import { useState } from "react"
import { Button } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"
import { Plus, Edit2, AlertCircle } from "lucide-react"

export interface OfertaFormData {
  id?: string
  nome: string
  plataformas: string[]
  vertical?: string | null
  geoPrioritario?: string | null
  comissaoValor?: number | null
  epcRede?: number | null
  refundPct?: number | null
  cvrRede?: number | null
  cpcMinimo?: number | null
  cpcMaximo?: number | null
  cpcMedioEsperado?: number | null
  volumeBuscaMensal?: number | null
  brandBiddingPermitido?: boolean
  keywordsPrioritarias?: string[]
  statusDecisao?: string | null
  observacoes?: string | null
}

export function ModalOfertaForm({
  initialData,
  onSuccess,
  onClose,
}: {
  initialData?: OfertaFormData | null
  onSuccess: () => void
  onClose: () => void
}) {
  const isEditing = !!initialData?.id

  const [nome, setNome] = useState(initialData?.nome || "")
  const [plataformasStr, setPlataformasStr] = useState((initialData?.plataformas || []).join(", "))
  const [vertical, setVertical] = useState(initialData?.vertical || "")
  const [geoPrioritario, setGeoPrioritario] = useState(initialData?.geoPrioritario || "")
  const [comissaoValor, setComissaoValor] = useState(initialData?.comissaoValor ? String(initialData.comissaoValor) : "")
  const [epcRede, setEpcRede] = useState(initialData?.epcRede ? String(initialData.epcRede) : "")
  const [refundPct, setRefundPct] = useState(initialData?.refundPct ? String(initialData.refundPct) : "")
  
  // Google Ads fields
  const [cpcMinimo, setCpcMinimo] = useState(initialData?.cpcMinimo ? String(initialData.cpcMinimo) : "")
  const [cpcMaximo, setCpcMaximo] = useState(initialData?.cpcMaximo ? String(initialData.cpcMaximo) : "")
  const [cpcMedioEsperado, setCpcMedioEsperado] = useState(initialData?.cpcMedioEsperado ? String(initialData.cpcMedioEsperado) : "")
  const [volumeBuscaMensal, setVolumeBuscaMensal] = useState(initialData?.volumeBuscaMensal ? String(initialData.volumeBuscaMensal) : "")
  const [brandBiddingPermitido, setBrandBiddingPermitido] = useState(initialData?.brandBiddingPermitido ?? true)
  const [keywordsStr, setKeywordsStr] = useState((initialData?.keywordsPrioritarias || []).join(", "))
  
  const [statusDecisao, setStatusDecisao] = useState(initialData?.statusDecisao || "GARIMPO")
  const [observacoes, setObservacoes] = useState(initialData?.observacoes || "")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const plataformas = plataformasStr.split(",").map((s) => s.trim()).filter(Boolean)
    const keywordsPrioritarias = keywordsStr.split(",").map((s) => s.trim()).filter(Boolean)

    const payload = {
      nome,
      plataformas,
      vertical: vertical || null,
      geoPrioritario: geoPrioritario || null,
      comissaoValor: comissaoValor ? parseFloat(comissaoValor) : null,
      epcRede: epcRede ? parseFloat(epcRede) : null,
      refundPct: refundPct ? parseFloat(refundPct) : null,
      cpcMinimo: cpcMinimo ? parseFloat(cpcMinimo) : null,
      cpcMaximo: cpcMaximo ? parseFloat(cpcMaximo) : null,
      cpcMedioEsperado: cpcMedioEsperado ? parseFloat(cpcMedioEsperado) : null,
      volumeBuscaMensal: volumeBuscaMensal ? parseInt(volumeBuscaMensal, 10) : null,
      brandBiddingPermitido,
      keywordsPrioritarias,
      statusDecisao,
      observacoes: observacoes || null,
    }

    try {
      const url = isEditing
        ? apiUrl(`/api/afiliados/radar/${initialData.id}`)
        : apiUrl("/api/afiliados/radar")
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar oferta")
      }

      onSuccess()
    } catch (err: unknown) {
      setError((err as Error).message || "Erro ao salvar dados")
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
          maxWidth: 620,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
            {isEditing ? "Editar Oferta" : "Nova Oferta no Radar"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 20 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Nome da Oferta *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Purotyn GLP-1 Support"
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
                Status Decisão
              </label>
              <select
                value={statusDecisao}
                onChange={(e) => setStatusDecisao(e.target.value)}
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
                <option value="GARIMPO">Garimpo</option>
                <option value="ANALISE">Em Análise</option>
                <option value="APROVADO_TESTE">Aprovado p/ Teste</option>
                <option value="EM_EXECUCAO">Em Execução</option>
                <option value="PAUSADO">Pausado</option>
                <option value="DESCARTADO">Descartado</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Redes / Plataformas (separadas por vírgula)
              </label>
              <input
                type="text"
                value={plataformasStr}
                onChange={(e) => setPlataformasStr(e.target.value)}
                placeholder="BuyGoods, ClickBank, Mediascalers"
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
                Vertical
              </label>
              <input
                type="text"
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                placeholder="Health / Nutra"
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
                Geo Prioritário
              </label>
              <input
                type="text"
                value={geoPrioritario}
                onChange={(e) => setGeoPrioritario(e.target.value)}
                placeholder="US, DE, AU"
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

          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Economics da Rede
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Comissão ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={comissaoValor}
                onChange={(e) => setComissaoValor(e.target.value)}
                placeholder="150.00"
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
                EPC Rede ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={epcRede}
                onChange={(e) => setEpcRede(e.target.value)}
                placeholder="3.50"
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
                Refund (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={refundPct}
                onChange={(e) => setRefundPct(e.target.value)}
                placeholder="5.0"
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

          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Dados do Leilão (Google Ads)
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                CPC Mínimo ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={cpcMinimo}
                onChange={(e) => setCpcMinimo(e.target.value)}
                placeholder="0.80"
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
                CPC Máximo ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={cpcMaximo}
                onChange={(e) => setCpcMaximo(e.target.value)}
                placeholder="2.50"
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
                CPC Médio Esperado ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={cpcMedioEsperado}
                onChange={(e) => setCpcMedioEsperado(e.target.value)}
                placeholder="1.50"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Vol. de Buscas Mensal
              </label>
              <input
                type="number"
                value={volumeBuscaMensal}
                onChange={(e) => setVolumeBuscaMensal(e.target.value)}
                placeholder="12000"
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
              <input
                type="checkbox"
                id="brand-bidding-check"
                checked={brandBiddingPermitido}
                onChange={(e) => setBrandBiddingPermitido(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="brand-bidding-check" style={{ fontSize: 13, cursor: "pointer" }}>
                Brand Bidding Permitido (Fundo de funil)
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Palavras-chave Prioritárias (separadas por vírgula)
            </label>
            <input
              type="text"
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              placeholder="purotyn review, buy purotyn, purotyn ingredients"
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
              Observações / Análise de Compliance
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações sobre regras da oferta, restrições do Google Ads..."
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

          {error && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !nome.trim()}>
              {loading ? "Salvando..." : "Salvar Oferta"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
