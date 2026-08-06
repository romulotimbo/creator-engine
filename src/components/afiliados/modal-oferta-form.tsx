"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"
import { DISCOVERY_SOURCE_LABELS } from "@/lib/afiliados"
import { formatDate } from "@/lib/utils"
import { Plus, Edit2, AlertCircle, AlertTriangle, History } from "lucide-react"
import { NetworkReliabilityBadge } from "@/components/afiliados/network-reliability-badge"

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
  networkId?: string | null
  nextReviewAt?: string | Date | null
  domainUsed?: string | null
  termsVerifiedAt?: string | Date | null
  discoverySource?: string | null
}

interface NetworkOption {
  id: string
  nome: string
  paymentReliabilityScore: number | null
  reliabilityUpdatedAt: string | null
}

interface TermsVersionEntry {
  id: string
  verifiedAt: string
  termsUrl: string | null
  changesSummary: string | null
  capturedBy: string | null
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface-raised)",
  color: "var(--foreground)",
  fontSize: 13,
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }

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

  // Governança — Rede, Revisão, Domínio, Descoberta
  const [networkId, setNetworkId] = useState(initialData?.networkId || "")
  const [networks, setNetworks] = useState<NetworkOption[]>([])
  const [nextReviewAt, setNextReviewAt] = useState(
    initialData?.nextReviewAt ? new Date(initialData.nextReviewAt).toISOString().slice(0, 10) : "",
  )
  const [domainUsed, setDomainUsed] = useState(initialData?.domainUsed || "")
  const [flaggedDomains, setFlaggedDomains] = useState<Set<string>>(new Set())
  const [discoverySource, setDiscoverySource] = useState(initialData?.discoverySource || "")

  // Termos — histórico + registro de verificação
  const [termsVersions, setTermsVersions] = useState<TermsVersionEntry[]>([])
  const [showTermsForm, setShowTermsForm] = useState(false)
  const [termsHasChanged, setTermsHasChanged] = useState(false)
  const [termsChangesSummary, setTermsChangesSummary] = useState("")
  const [termsUrl, setTermsUrl] = useState("")
  const [termsSaving, setTermsSaving] = useState(false)
  const [lastTermsVerifiedAt, setLastTermsVerifiedAt] = useState(initialData?.termsVerifiedAt || null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(apiUrl("/api/afiliados/networks"))
      .then((res) => res.json())
      .then((data) => setNetworks(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch(apiUrl("/api/afiliados/domains?reputationStatus=flagged,burned"))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFlaggedDomains(new Set(data.map((d: { domain: string }) => d.domain.toLowerCase())))
        }
      })
      .catch(() => {})

    if (isEditing && initialData?.id) {
      fetch(apiUrl(`/api/afiliados/ofertas/${initialData.id}/terms`))
        .then((res) => res.json())
        .then((data) => setTermsVersions(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedNetwork = networks.find((n) => n.id === networkId)
  const domainHasNegativeHistory = domainUsed.trim() !== "" && flaggedDomains.has(domainUsed.trim().toLowerCase())

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
      networkId: networkId || null,
      nextReviewAt: nextReviewAt || null,
      domainUsed: domainUsed || null,
      discoverySource: discoverySource || null,
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

  async function handleRegistrarTermos() {
    if (!initialData?.id) return
    setTermsSaving(true)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/ofertas/${initialData.id}/terms`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasChanged: termsHasChanged,
          termsUrl: termsUrl || null,
          changesSummary: termsChangesSummary || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao registrar verificação de termos")

      setLastTermsVerifiedAt(data.termsVerifiedAt)
      if (data.termsVersion) setTermsVersions((prev) => [data.termsVersion, ...prev])
      setShowTermsForm(false)
      setTermsHasChanged(false)
      setTermsChangesSummary("")
      setTermsUrl("")
    } catch {
      // erro silencioso — não bloqueia o formulário principal da oferta
    } finally {
      setTermsSaving(false)
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
              <label style={labelStyle}>Nome da Oferta *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Purotyn GLP-1 Support"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Status Decisão</label>
              <select value={statusDecisao} onChange={(e) => setStatusDecisao(e.target.value)} style={inputStyle}>
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
              <label style={labelStyle}>Redes / Plataformas (separadas por vírgula)</label>
              <input
                type="text"
                value={plataformasStr}
                onChange={(e) => setPlataformasStr(e.target.value)}
                placeholder="BuyGoods, ClickBank, Mediascalers"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Vertical</label>
              <input
                type="text"
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                placeholder="Health / Nutra"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Geo Prioritário</label>
              <input
                type="text"
                value={geoPrioritario}
                onChange={(e) => setGeoPrioritario(e.target.value)}
                placeholder="US, DE, AU"
                style={inputStyle}
              />
            </div>
          </div>

          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Economics da Rede
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Comissão ($)</label>
              <input
                type="number"
                step="0.01"
                value={comissaoValor}
                onChange={(e) => setComissaoValor(e.target.value)}
                placeholder="150.00"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>EPC Rede ($)</label>
              <input
                type="number"
                step="0.01"
                value={epcRede}
                onChange={(e) => setEpcRede(e.target.value)}
                placeholder="3.50"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Refund (%)</label>
              <input
                type="number"
                step="0.1"
                value={refundPct}
                onChange={(e) => setRefundPct(e.target.value)}
                placeholder="5.0"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Rede (Network)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select value={networkId} onChange={(e) => setNetworkId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Sem rede vinculada</option>
                {networks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nome}
                  </option>
                ))}
              </select>
              {selectedNetwork && (
                <NetworkReliabilityBadge
                  paymentReliabilityScore={selectedNetwork.paymentReliabilityScore}
                  reliabilityUpdatedAt={selectedNetwork.reliabilityUpdatedAt}
                />
              )}
            </div>
          </div>

          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Dados do Leilão (Google Ads)
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>CPC Mínimo ($)</label>
              <input
                type="number"
                step="0.01"
                value={cpcMinimo}
                onChange={(e) => setCpcMinimo(e.target.value)}
                placeholder="0.80"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CPC Máximo ($)</label>
              <input
                type="number"
                step="0.01"
                value={cpcMaximo}
                onChange={(e) => setCpcMaximo(e.target.value)}
                placeholder="2.50"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CPC Médio Esperado ($)</label>
              <input
                type="number"
                step="0.01"
                value={cpcMedioEsperado}
                onChange={(e) => setCpcMedioEsperado(e.target.value)}
                placeholder="1.50"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Vol. de Buscas Mensal</label>
              <input
                type="number"
                value={volumeBuscaMensal}
                onChange={(e) => setVolumeBuscaMensal(e.target.value)}
                placeholder="12000"
                style={inputStyle}
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
            <label style={labelStyle}>Palavras-chave Prioritárias (separadas por vírgula)</label>
            <input
              type="text"
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              placeholder="purotyn review, buy purotyn, purotyn ingredients"
              style={inputStyle}
            />
          </div>

          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Governança
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Próxima Revisão</label>
              <input
                type="date"
                value={nextReviewAt}
                onChange={(e) => setNextReviewAt(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Origem da Descoberta</label>
              <select value={discoverySource} onChange={(e) => setDiscoverySource(e.target.value)} style={inputStyle}>
                <option value="">Não informado</option>
                {Object.entries(DISCOVERY_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Domínio Utilizado</label>
            <input
              type="text"
              value={domainUsed}
              onChange={(e) => setDomainUsed(e.target.value)}
              placeholder="ofertaexemplo.com"
              style={inputStyle}
            />
            {domainHasNegativeHistory && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 12, color: "var(--warning)" }}>
                <AlertTriangle size={13} />
                <span>Este domínio tem histórico de reputação negativa</span>
              </div>
            )}
          </div>

          {isEditing && (
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>Termos verificados: </span>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {lastTermsVerifiedAt ? formatDate(lastTermsVerifiedAt) : "Nunca"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsForm((v) => !v)}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 8px", fontSize: 11, color: "var(--foreground)", cursor: "pointer" }}
                >
                  Registrar verificação de termos
                </button>
              </div>

              {showTermsForm && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={termsHasChanged} onChange={(e) => setTermsHasChanged(e.target.checked)} />
                    Houve mudança percebida nos termos
                  </label>
                  {termsHasChanged && (
                    <>
                      <input
                        type="text"
                        value={termsUrl}
                        onChange={(e) => setTermsUrl(e.target.value)}
                        placeholder="URL dos termos (opcional)"
                        style={inputStyle}
                      />
                      <textarea
                        rows={2}
                        value={termsChangesSummary}
                        onChange={(e) => setTermsChangesSummary(e.target.value)}
                        placeholder="O que mudou nos termos?"
                        style={inputStyle}
                      />
                    </>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button type="button" onClick={handleRegistrarTermos} disabled={termsSaving} style={{ fontSize: 12, padding: "4px 10px" }}>
                      {termsSaving ? "Salvando..." : "Confirmar"}
                    </Button>
                  </div>
                </div>
              )}

              {termsVersions.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-foreground)" }}>
                    <History size={12} /> Histórico de mudanças
                  </div>
                  {termsVersions.map((v) => (
                    <div key={v.id} style={{ fontSize: 11, color: "var(--muted-foreground)", paddingLeft: 4, borderLeft: "2px solid var(--border-subtle)" }}>
                      <strong style={{ color: "var(--foreground)" }}>{formatDate(v.verifiedAt)}</strong>
                      {v.changesSummary && <span> — {v.changesSummary}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Observações / Análise de Compliance</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações sobre regras da oferta, restrições do Google Ads..."
              style={inputStyle}
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
