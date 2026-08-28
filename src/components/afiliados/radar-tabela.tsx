"use client"

import { useEffect, useMemo, useState } from "react"
import { Surface, Button, Badge } from "@/components/ui/primitives"
import {
  STATUS_DECISAO_LABELS,
  COMPLETUDE_DADOS_LABELS,
  DISCOVERY_SOURCE_LABELS,
  SATURACAO_AFILIADOS_LABELS,
} from "@/lib/afiliados"
import { isReviewDue } from "@/lib/afiliados/review"
import {
  Rocket, Edit2, Trash2, Search, ArrowUpDown, Filter, AlertTriangle, Columns3, Ban, Check,
} from "lucide-react"

export interface RadarOfertaItem {
  id: string
  nome: string
  plataformas: string[]
  vertical: string | null
  geoPrioritario: string | null
  geosPermitidos?: string[]
  visitasTotais: number | null
  tendenciaTrafego30d: number | null
  tendenciaTrafego60d: number | null
  tendenciaTrafego90d: number | null
  statusTendencia: string | null
  comissaoValor: number | null
  epcRede: number | null
  cvrRede: number | null
  refundPct: number | null
  cpcMedioEsperado: number | null
  volumeBuscaMensal: number | null
  brandBiddingPermitido: boolean
  keywordsPrioritarias: string[]
  scoreCalculado: number
  completudeDados: "COMPLETO" | "PARCIAL" | "INCOMPLETO"
  statusDecisao: string
  budgetTesteAlocado: number | null
  observacoes: string | null
  nextReviewAt?: string | null
  domainUsed?: string | null
  networkId?: string | null
  discoverySource?: string | null
  termsVerifiedAt?: string | null
  createdAt?: string | null
  saturacaoAfiliados?: string | null
  conversionPoint?: string | null
  tipoProduto?: string | null
  ltvEstimadoRebill?: number | null
  criterioPausa?: string | null
  curvaAscendente?: {
    prioridade: string
    resumo: string
    evidencia: { termos?: Array<{ termo: string; janela: string | null }> } | null
  } | null
  criterioEscala?: string | null
}

const COL_STORAGE_KEY = "ce.radar.colunas"

type ColId =
  | "completude"
  | "score"
  | "vertical"
  | "geo"
  | "volume"
  | "epc"
  | "comissao"
  | "refund"
  | "t30"
  | "cpc"
  | "brand"
  | "revisao"
  | "status"
  | "idade"
  | "saturacao"
  | "origem"

const COL_META: { id: ColId; label: string; defaultOn: boolean }[] = [
  { id: "completude", label: "Completude", defaultOn: true },
  { id: "score", label: "Score", defaultOn: true },
  { id: "vertical", label: "Vertical", defaultOn: true },
  { id: "geo", label: "Geo", defaultOn: true },
  { id: "volume", label: "Vol. buscas", defaultOn: true },
  { id: "epc", label: "EPC", defaultOn: true },
  { id: "comissao", label: "Comissão", defaultOn: true },
  { id: "refund", label: "Refund", defaultOn: true },
  { id: "t30", label: "Tendência 30d", defaultOn: true },
  { id: "cpc", label: "CPC Ads", defaultOn: true },
  { id: "brand", label: "Brand bidding", defaultOn: true },
  { id: "revisao", label: "Próxima revisão", defaultOn: true },
  { id: "status", label: "Status", defaultOn: true },
  { id: "idade", label: "Idade", defaultOn: false },
  { id: "saturacao", label: "Saturação", defaultOn: false },
  { id: "origem", label: "Origem", defaultOn: false },
]

function defaultVisibility(): Record<ColId, boolean> {
  return Object.fromEntries(COL_META.map((c) => [c.id, c.defaultOn])) as Record<ColId, boolean>
}

function loadVisibility(): Record<ColId, boolean> {
  const base = defaultVisibility()
  try {
    const raw = localStorage.getItem(COL_STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<Record<ColId, boolean>>
    for (const col of COL_META) {
      if (typeof parsed[col.id] === "boolean") base[col.id] = parsed[col.id]!
    }
    return base
  } catch {
    return base
  }
}

function toReviewableOffer(o: RadarOfertaItem) {
  return {
    approvalStatus: o.statusDecisao === "ANALISE" ? "pending" : o.statusDecisao,
    nextReviewAt: o.nextReviewAt ?? null,
  }
}

function daysSince(iso?: string | null) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

function formatReviewDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

const selectStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface-raised)",
  color: "var(--foreground)",
  fontSize: 12,
}

export function RadarTabela({
  ofertas,
  onEdit,
  onDelete,
  onMigrar,
}: {
  ofertas: RadarOfertaItem[]
  onEdit: (oferta: RadarOfertaItem) => void
  onDelete: (id: string) => void
  onMigrar: (oferta: RadarOfertaItem) => void
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [platformFilter, setPlatformFilter] = useState("ALL")
  const [completudeFilter, setCompletudeFilter] = useState("ALL")
  const [verticalFilter, setVerticalFilter] = useState("ALL")
  const [origemFilter, setOrigemFilter] = useState("ALL")
  const [onlyReviewDue, setOnlyReviewDue] = useState(false)
  const [sortBy, setSortBy] = useState<"score" | "epc" | "cpc" | "t30" | "comissao">("score")
  const [sortAsc, setSortAsc] = useState(false)
  const [cols, setCols] = useState<Record<ColId, boolean>>(defaultVisibility)
  const [showCols, setShowCols] = useState(false)

  useEffect(() => {
    setCols(loadVisibility())
  }, [])

  function toggleCol(id: ColId) {
    setCols((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const todasRedes = Array.from(new Set(ofertas.flatMap((o) => o.plataformas))).sort()
  const verticais = Array.from(new Set(ofertas.map((o) => o.vertical).filter(Boolean) as string[])).sort()
  const origens = Array.from(new Set(ofertas.map((o) => o.discoverySource).filter(Boolean) as string[])).sort()
  const reviewDueCount = ofertas.filter((o) => isReviewDue(toReviewableOffer(o), today)).length

  const filtered = useMemo(() => {
    return ofertas
      .filter((o) => {
        const matchSearch = o.nome.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === "ALL" || o.statusDecisao === statusFilter
        const matchPlatform = platformFilter === "ALL" || o.plataformas.includes(platformFilter)
        const matchReview = !onlyReviewDue || isReviewDue(toReviewableOffer(o), today)
        const matchCompletude = completudeFilter === "ALL" || o.completudeDados === completudeFilter
        const matchVertical = verticalFilter === "ALL" || o.vertical === verticalFilter
        const matchOrigem = origemFilter === "ALL" || o.discoverySource === origemFilter
        return matchSearch && matchStatus && matchPlatform && matchReview && matchCompletude && matchVertical && matchOrigem
      })
      .sort((a, b) => {
        let valA = 0
        let valB = 0
        if (sortBy === "score") {
          valA = a.scoreCalculado
          valB = b.scoreCalculado
        } else if (sortBy === "epc") {
          valA = a.epcRede ?? 0
          valB = b.epcRede ?? 0
        } else if (sortBy === "cpc") {
          valA = a.cpcMedioEsperado ?? 0
          valB = b.cpcMedioEsperado ?? 0
        } else if (sortBy === "t30") {
          valA = a.tendenciaTrafego30d ?? 0
          valB = b.tendenciaTrafego30d ?? 0
        } else if (sortBy === "comissao") {
          valA = a.comissaoValor ?? 0
          valB = b.comissaoValor ?? 0
        }
        return sortAsc ? valA - valB : valB - valA
      })
  }, [ofertas, search, statusFilter, platformFilter, onlyReviewDue, completudeFilter, verticalFilter, origemFilter, sortBy, sortAsc, today])

  function toggleSort(field: "score" | "epc" | "cpc" | "t30" | "comissao") {
    if (sortBy === field) setSortAsc(!sortAsc)
    else {
      setSortBy(field)
      setSortAsc(false)
    }
  }

  const visibleCount = COL_META.filter((c) => cols[c.id]).length + 2

  return (
    <Surface style={{ padding: "var(--space-md)", overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: "var(--space-md)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 10px", width: "100%", maxWidth: 320 }}>
            <Search size={16} style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da oferta..."
              style={{ background: "none", border: "none", outline: "none", color: "var(--foreground)", fontSize: 13, width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Filter size={14} style={{ color: "var(--muted-foreground)" }} />
            <span>Rede:</span>
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">Todas as Redes</option>
              {todasRedes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span>Status:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">Todos os Status</option>
              {Object.entries(STATUS_DECISAO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span>Completude:</span>
            <select value={completudeFilter} onChange={(e) => setCompletudeFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">Todas</option>
              <option value="COMPLETO">Completo</option>
              <option value="PARCIAL">Parcial</option>
              <option value="INCOMPLETO">Incompleto</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span>Vertical:</span>
            <select value={verticalFilter} onChange={(e) => setVerticalFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">Todas</option>
              {verticais.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span>Origem:</span>
            <select value={origemFilter} onChange={(e) => setOrigemFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">Todas</option>
              {origens.map((v) => <option key={v} value={v}>{DISCOVERY_SOURCE_LABELS[v] || v}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setOnlyReviewDue((v) => !v)}
            title="Ofertas com aprovação pendente ou revisão vencida"
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${onlyReviewDue ? "var(--warning)" : "var(--border)"}`,
              backgroundColor: onlyReviewDue ? "rgba(234, 179, 8, 0.15)" : "var(--surface-raised)",
              color: onlyReviewDue ? "var(--warning)" : "var(--foreground)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            <AlertTriangle size={13} /> Precisa de revisão
            {reviewDueCount > 0 && (
              <Badge variant={onlyReviewDue ? "warning" : "secondary"} style={{ fontSize: 9, padding: "1px 5px" }}>
                {reviewDueCount}
              </Badge>
            )}
          </button>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowCols((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--surface-raised)", color: "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <Columns3 size={13} /> Colunas
            </button>
            {showCols && (
              <div style={{ position: "absolute", right: 0, top: "110%", zIndex: 20, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
                {COL_META.map((c) => (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 6px", cursor: "pointer" }}>
                    <input type="checkbox" checked={cols[c.id]} onChange={() => toggleCol(c.id)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textIndent: 0 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", textAlign: "left" }}>
            <th style={{ padding: "8px 12px" }}>Oferta</th>
            <th style={{ padding: "8px 12px" }}>Redes</th>
            {cols.completude && <th style={{ padding: "8px 12px" }}>Completude</th>}
            {cols.score && (
              <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("score")}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Score <ArrowUpDown size={12} /></div>
              </th>
            )}
            {cols.vertical && <th style={{ padding: "8px 12px" }}>Vertical</th>}
            {cols.geo && <th style={{ padding: "8px 12px" }}>Geo</th>}
            {cols.volume && <th style={{ padding: "8px 12px" }}>Vol. buscas</th>}
            {cols.epc && (
              <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("epc")}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>EPC <ArrowUpDown size={12} /></div>
              </th>
            )}
            {cols.comissao && (
              <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("comissao")}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Comissão <ArrowUpDown size={12} /></div>
              </th>
            )}
            {cols.refund && <th style={{ padding: "8px 12px" }}>Refund</th>}
            {cols.t30 && (
              <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("t30")}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Tendência 30d <ArrowUpDown size={12} /></div>
              </th>
            )}
            {cols.cpc && (
              <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("cpc")}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>CPC Ads <ArrowUpDown size={12} /></div>
              </th>
            )}
            {cols.brand && <th style={{ padding: "8px 12px" }}>Brand</th>}
            {cols.revisao && <th style={{ padding: "8px 12px" }}>Revisão</th>}
            {cols.idade && <th style={{ padding: "8px 12px" }}>Idade</th>}
            {cols.saturacao && <th style={{ padding: "8px 12px" }}>Saturação</th>}
            {cols.origem && <th style={{ padding: "8px 12px" }}>Origem</th>}
            {cols.status && <th style={{ padding: "8px 12px" }}>Status</th>}
            <th style={{ padding: "8px 12px", textAlign: "right" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => {
            const isEmExecucao = item.statusDecisao === "EM_EXECUCAO"
            const isCompleto = item.completudeDados === "COMPLETO"
            const reviewDue = isReviewDue(toReviewableOffer(item), today)
            const idade = daysSince(item.createdAt)
            const geosN = item.geosPermitidos?.length ?? 0

            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  backgroundColor: reviewDue ? "rgba(234, 179, 8, 0.06)" : "transparent",
                }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)", fontSize: 14 }}>
                    {reviewDue && <AlertTriangle size={13} style={{ color: "var(--warning)", flexShrink: 0 }} aria-label="Precisa de revisão" />}
                    {item.curvaAscendente && (
                      <span
                        title={`${item.curvaAscendente.resumo}${
                          item.curvaAscendente.evidencia?.termos?.length
                            ? " — " + item.curvaAscendente.evidencia.termos.map((t) => `${t.termo} (${t.janela ?? "—"})`).join(", ")
                            : ""
                        }`}
                        style={{ fontSize: 13, flexShrink: 0, cursor: "help" }}
                      >
                        {item.curvaAscendente.prioridade === "ALTA" ? "🔥" : "📈"}
                      </span>
                    )}
                    {item.nome}
                  </div>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.plataformas.map((p) => (
                      <span key={p} style={{ backgroundColor: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600 }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                {cols.completude && (
                  <td style={{ padding: "10px 12px" }}>
                    <Badge variant={isCompleto ? "default" : "secondary"} style={{ fontSize: 9, padding: "1px 4px" }}>
                      {COMPLETUDE_DADOS_LABELS[item.completudeDados]}
                    </Badge>
                  </td>
                )}
                {cols.score && (
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: item.scoreCalculado >= 70 ? "var(--success)" : item.scoreCalculado >= 40 ? "var(--accent)" : "var(--muted-foreground)" }}>
                      {item.scoreCalculado.toFixed(1)}
                    </span>
                  </td>
                )}
                {cols.vertical && <td style={{ padding: "10px 12px" }}>{item.vertical || "—"}</td>}
                {cols.geo && (
                  <td style={{ padding: "10px 12px" }}>
                    {item.geoPrioritario || "—"}
                    {geosN > 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}> · {geosN}</span>}
                  </td>
                )}
                {cols.volume && (
                  <td style={{ padding: "10px 12px" }}>
                    {item.volumeBuscaMensal != null ? item.volumeBuscaMensal.toLocaleString("pt-BR") : "—"}
                  </td>
                )}
                {cols.epc && <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.epcRede != null ? `$${item.epcRede.toFixed(2)}` : "—"}</td>}
                {cols.comissao && <td style={{ padding: "10px 12px" }}>{item.comissaoValor != null ? `$${item.comissaoValor.toFixed(2)}` : "—"}</td>}
                {cols.refund && <td style={{ padding: "10px 12px" }}>{item.refundPct != null ? `${item.refundPct.toFixed(1)}%` : "—"}</td>}
                {cols.t30 && (
                  <td style={{ padding: "10px 12px" }}>
                    {item.tendenciaTrafego30d != null ? (
                      <span style={{ color: item.tendenciaTrafego30d >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                        {item.tendenciaTrafego30d >= 0 ? `+${item.tendenciaTrafego30d}%` : `${item.tendenciaTrafego30d}%`}
                      </span>
                    ) : "—"}
                  </td>
                )}
                {cols.cpc && (
                  <td style={{ padding: "10px 12px" }}>
                    {item.cpcMedioEsperado != null ? `$${item.cpcMedioEsperado.toFixed(2)}` : <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>Sem Ads</span>}
                  </td>
                )}
                {cols.brand && (
                  <td style={{ padding: "10px 12px" }} title={item.brandBiddingPermitido ? "Brand bidding permitido" : "Brand bidding proibido"}>
                    {item.brandBiddingPermitido ? <Check size={14} style={{ color: "var(--success)" }} /> : <Ban size={14} style={{ color: "var(--danger)" }} />}
                  </td>
                )}
                {cols.revisao && (
                  <td style={{ padding: "10px 12px" }}>
                    {reviewDue ? (
                      <Badge variant="warning" style={{ fontSize: 10 }}>Vencida {formatReviewDate(item.nextReviewAt)}</Badge>
                    ) : (
                      formatReviewDate(item.nextReviewAt)
                    )}
                  </td>
                )}
                {cols.idade && <td style={{ padding: "10px 12px" }}>{idade != null ? `${idade}d` : "—"}</td>}
                {cols.saturacao && <td style={{ padding: "10px 12px" }}>{item.saturacaoAfiliados ? SATURACAO_AFILIADOS_LABELS[item.saturacaoAfiliados] || item.saturacaoAfiliados : "—"}</td>}
                {cols.origem && <td style={{ padding: "10px 12px" }}>{item.discoverySource ? DISCOVERY_SOURCE_LABELS[item.discoverySource] || item.discoverySource : "—"}</td>}
                {cols.status && (
                  <td style={{ padding: "10px 12px" }}>
                    <Badge variant={isEmExecucao ? "default" : "outline"} style={{ fontSize: 11 }}>
                      {STATUS_DECISAO_LABELS[item.statusDecisao] || item.statusDecisao}
                    </Badge>
                  </td>
                )}
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {!isEmExecucao && (
                      <Button onClick={() => onMigrar(item)} style={{ fontSize: 12, padding: "4px 8px", backgroundColor: "var(--accent)" }} title="Criar Campanha na Conta de Tráfego">
                        <Rocket size={13} style={{ marginRight: 4 }} /> Go!
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => onEdit(item)} title="Editar dados" style={{ padding: "4px 8px" }}>
                      <Edit2 size={13} />
                    </Button>
                    <Button variant="ghost" onClick={() => onDelete(item.id)} title="Excluir oferta" style={{ padding: "4px 8px" }}>
                      <Trash2 size={13} style={{ color: "var(--danger)" }} />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={visibleCount} style={{ padding: "var(--space-lg)", textAlign: "center", color: "var(--muted-foreground)" }}>
                Nenhuma oferta encontrada para os filtros selecionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Surface>
  )
}
