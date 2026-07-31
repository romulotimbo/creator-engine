"use client"

import { useState } from "react"
import { Surface, Button, Badge } from "@/components/ui/primitives"
import { STATUS_DECISAO_LABELS, COMPLETUDE_DADOS_LABELS } from "@/lib/afiliados"
import { Rocket, Edit2, Trash2, Search, ArrowUpDown, Filter } from "lucide-react"

export interface RadarOfertaItem {
  id: string
  nome: string
  plataformas: string[]
  vertical: string | null
  geoPrioritario: string | null
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
  const [sortBy, setSortBy] = useState<"score" | "epc" | "cpc" | "t30" | "comissao">("score")
  const [sortAsc, setSortAsc] = useState(false)

  // Extrair redes únicas de todas as ofertas
  const todasRedes = Array.from(new Set(ofertas.flatMap((o) => o.plataformas))).sort()

  const filtered = ofertas
    .filter((o) => {
      const matchSearch = o.nome.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "ALL" || o.statusDecisao === statusFilter
      const matchPlatform = platformFilter === "ALL" || o.plataformas.includes(platformFilter)
      return matchSearch && matchStatus && matchPlatform
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

  function toggleSort(field: "score" | "epc" | "cpc" | "t30" | "comissao") {
    if (sortBy === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(field)
      setSortAsc(false)
    }
  }

  return (
    <Surface style={{ padding: "var(--space-md)", overflowX: "auto" }}>
      {/* Controles de Filtros e Pesquisa */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 240 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              width: "100%",
              maxWidth: 320,
            }}
          >
            <Search size={16} style={{ color: "var(--muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da oferta..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--foreground)",
                fontSize: 13,
                width: "100%",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Filter size={14} style={{ color: "var(--muted)" }} />
            <span>Rede:</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-subtle)",
                color: "var(--foreground)",
                fontSize: 12,
              }}
            >
              <option value="ALL">Todas as Redes</option>
              {todasRedes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-subtle)",
                color: "var(--foreground)",
                fontSize: 12,
              }}
            >
              <option value="ALL">Todos os Status</option>
              <option value="GARIMPO">Garimpo</option>
              <option value="ANALISE">Em Análise</option>
              <option value="APROVADO_TESTE">Aprovado p/ Teste</option>
              <option value="EM_EXECUCAO">Em Execução</option>
              <option value="PAUSADO">Pausado</option>
              <option value="DESCARTADO">Descartado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Ofertas */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textIndent: 0 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)", textAlign: "left" }}>
            <th style={{ padding: "8px 12px" }}>Oferta</th>
            <th style={{ padding: "8px 12px" }}>Redes</th>
            <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("score")}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Score <ArrowUpDown size={12} />
              </div>
            </th>
            <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("epc")}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                EPC <ArrowUpDown size={12} />
              </div>
            </th>
            <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("comissao")}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Comissão <ArrowUpDown size={12} />
              </div>
            </th>
            <th style={{ padding: "8px 12px" }}>Refund</th>
            <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("t30")}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Tendência 30d <ArrowUpDown size={12} />
              </div>
            </th>
            <th style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => toggleSort("cpc")}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                CPC Ads <ArrowUpDown size={12} />
              </div>
            </th>
            <th style={{ padding: "8px 12px" }}>Status</th>
            <th style={{ padding: "8px 12px", textAlign: "right" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => {
            const isEmExecucao = item.statusDecisao === "EM_EXECUCAO"
            const isCompleto = item.completudeDados === "COMPLETO"

            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  transition: "background-color 0.15s",
                }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                  <div style={{ color: "var(--foreground)", fontSize: 14 }}>{item.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 6, marginTop: 2 }}>
                    {item.vertical && <span>{item.vertical}</span>}
                    {item.geoPrioritario && <span>• Geo: {item.geoPrioritario}</span>}
                  </div>
                </td>

                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.plataformas.map((p) => (
                      <span
                        key={p}
                        style={{
                          backgroundColor: "var(--surface-subtle)",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </td>

                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color:
                          item.scoreCalculado >= 70
                            ? "var(--success)"
                            : item.scoreCalculado >= 40
                            ? "var(--accent)"
                            : "var(--muted)",
                      }}
                    >
                      {item.scoreCalculado.toFixed(1)}
                    </span>
                    <Badge variant={isCompleto ? "default" : "secondary"} style={{ fontSize: 9, padding: "1px 4px" }}>
                      {COMPLETUDE_DADOS_LABELS[item.completudeDados]}
                    </Badge>
                  </div>
                </td>

                <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--foreground)" }}>
                  {item.epcRede != null ? `$${item.epcRede.toFixed(2)}` : "—"}
                </td>

                <td style={{ padding: "10px 12px" }}>
                  {item.comissaoValor != null ? `$${item.comissaoValor.toFixed(2)}` : "—"}
                </td>

                <td style={{ padding: "10px 12px" }}>
                  {item.refundPct != null ? `${item.refundPct.toFixed(1)}%` : "—"}
                </td>

                <td style={{ padding: "10px 12px" }}>
                  {item.tendenciaTrafego30d != null ? (
                    <span style={{ color: item.tendenciaTrafego30d >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {item.tendenciaTrafego30d >= 0 ? `+${item.tendenciaTrafego30d}%` : `${item.tendenciaTrafego30d}%`}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>

                <td style={{ padding: "10px 12px" }}>
                  {item.cpcMedioEsperado != null ? (
                    `$${item.cpcMedioEsperado.toFixed(2)}`
                  ) : (
                    <span style={{ color: "var(--faint)", fontSize: 11 }}>Sem Ads</span>
                  )}
                </td>

                <td style={{ padding: "10px 12px" }}>
                  <Badge variant={isEmExecucao ? "default" : "outline"} style={{ fontSize: 11 }}>
                    {STATUS_DECISAO_LABELS[item.statusDecisao] || item.statusDecisao}
                  </Badge>
                </td>

                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {!isEmExecucao && (
                      <Button
                        onClick={() => onMigrar(item)}
                        style={{ fontSize: 12, padding: "4px 8px", backgroundColor: "var(--accent)" }}
                        title="Criar Campanha na Conta de Tráfego"
                      >
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
              <td colSpan={10} style={{ padding: "var(--space-lg)", textAlign: "center", color: "var(--muted)" }}>
                Nenhuma oferta encontrada para os filtros selecionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Surface>
  )
}
