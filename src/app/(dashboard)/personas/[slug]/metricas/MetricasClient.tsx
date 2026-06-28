"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import type { ContaMetrica, SnapshotRow } from "./types"
import { formatCurrency, getProgressPercent } from "@/lib/utils"

const LINE_COLORS = ["var(--accent)", "var(--success)", "var(--cyan)", "var(--warning)", "var(--danger)"]

const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24,
}
const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }
const tooltipStyle = {
  background: "var(--border)", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--foreground)", fontSize: 12,
}

type Period = "30d" | "90d" | "180d" | "all"
type ModalMode = { type: "create" } | { type: "edit"; row: SnapshotRow }

const today = () => new Date().toISOString().slice(0, 10)

function formatDelta(n: number | null, suffix = ""): string {
  if (n == null) return "—"
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toLocaleString("pt-BR")}${suffix}`
}

function deltaColor(n: number | null): string {
  if (n == null) return "var(--muted-foreground)"
  if (n > 0) return "var(--success)"
  if (n < 0) return "var(--danger)"
  return "var(--muted-foreground)"
}

function periodCutoff(period: Period): Date | null {
  if (period === "all") return null
  const days = period === "30d" ? 30 : period === "90d" ? 90 : 180
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

export default function MetricasClient({
  contas, snapshots, plataformas, plataformaLabels,
}: {
  contas: ContaMetrica[]
  snapshots: SnapshotRow[]
  plataformas: string[]
  plataformaLabels: Record<string, string>
}) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>("90d")
  const [filtroConta, setFiltroConta] = useState<string>("all")
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [contaId, setContaId] = useState(contas[0]?.id ?? "")
  const [data, setData] = useState(today())
  const [seguidores, setSeguidores] = useState("")
  const [engajamento, setEngajamento] = useState("")
  const [postsPublicados, setPostsPublicados] = useState("0")
  const [receitaDia, setReceitaDia] = useState("")

  function openCreate(presetContaId?: string) {
    setModal({ type: "create" })
    setError(null)
    setContaId(presetContaId ?? contas[0]?.id ?? "")
    setData(today())
    setSeguidores("")
    setEngajamento("")
    setPostsPublicados("0")
    setReceitaDia("")
  }

  function openEdit(row: SnapshotRow) {
    setModal({ type: "edit", row })
    setError(null)
    setContaId(row.contaId)
    setData(row.data)
    setSeguidores(String(row.seguidores))
    setEngajamento(row.engajamento != null ? String(row.engajamento) : "")
    setPostsPublicados(String(row.postsPublicados))
    setReceitaDia(row.receitaDia != null ? String(row.receitaDia) : "")
  }

  const filteredSnapshots = useMemo(() => {
    const cutoff = periodCutoff(period)
    return snapshots.filter((s) => {
      if (filtroConta !== "all" && s.contaId !== filtroConta) return false
      if (cutoff && new Date(s.data + "T00:00:00Z") < cutoff) return false
      return true
    })
  }, [snapshots, period, filtroConta])

  const chartSeries = useMemo(() => {
    const cutoff = periodCutoff(period)
    const map: Record<string, Record<string, number | string>> = {}
    const asc = [...snapshots].sort((a, b) => a.data.localeCompare(b.data))
    for (const s of asc) {
      if (filtroConta !== "all" && s.contaId !== filtroConta) continue
      if (cutoff && new Date(s.data + "T00:00:00Z") < cutoff) continue
      const key = s.data.split("-").reverse().join("/").slice(0, 5) // dd/MM
      map[s.data] ||= { date: key, sort: s.data }
      map[s.data][s.plataforma] = s.seguidores
    }
    return Object.values(map).sort((a, b) => String(a.sort).localeCompare(String(b.sort)))
  }, [snapshots, period, filtroConta])

  const chartPlataformas = useMemo(() => {
    if (filtroConta !== "all") {
      const c = contas.find((x) => x.id === filtroConta)
      return c ? [c.plataforma] : plataformas
    }
    return plataformas
  }, [filtroConta, contas, plataformas])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!contaId) { setError("Selecione uma conta."); return }
    if (!seguidores || Number(seguidores) < 0) { setError("Informe seguidores válidos."); return }

    const payload = {
      contaId,
      data,
      seguidores: Number(seguidores),
      engajamento: engajamento ? Number(engajamento) : null,
      postsPublicados: Number(postsPublicados) || 0,
      receitaDia: receitaDia ? Number(receitaDia) : null,
    }

    setSaving(true)
    try {
      const isEdit = modal?.type === "edit"
      const url = isEdit ? `/api/metricas/${modal.row.id}` : "/api/metricas"
      const method = isEdit ? "PUT" : "POST"
      const body = isEdit
        ? { data: payload.data, seguidores: payload.seguidores, engajamento: payload.engajamento, postsPublicados: payload.postsPublicados, receitaDia: payload.receitaDia }
        : payload

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar métrica.")

      setModal(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/metricas/${deleteId}`, { method: "DELETE" })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao excluir.")
      setDeleteId(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button
          onClick={() => openCreate()}
          style={{ padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          + Registrar métrica
        </button>
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        {contas.map((c) => (
          <div key={c.id} style={{ ...card, padding: 20 }}>
            <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 4 }}>{plataformaLabels[c.plataforma] || c.plataforma}</p>
            <p style={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 8 }}>@{c.handle}</p>
            <p style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 700 }}>{c.seguidoresAtual.toLocaleString("pt-BR")}</p>
            <p style={{ color: deltaColor(c.delta7d), fontSize: 13, marginTop: 4 }}>
              {c.delta7d != null ? `${formatDelta(c.delta7d)} (7d)` : "Sem histórico suficiente"}
            </p>
            {c.metaSeguidores != null && c.metaSeguidores > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ background: "var(--border-strong)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                  <div style={{ background: "var(--accent)", height: "100%", width: `${getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}%` }} />
                </div>
                <p style={{ color: "var(--faint)", fontSize: 11, marginTop: 4 }}>
                  {getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}% da meta
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => openCreate(c.id)}
              style={{ marginTop: 12, background: "transparent", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0 }}
            >
              Registrar →
            </button>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Evolução de seguidores</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["30d", "90d", "180d", "all"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                  background: period === p ? "var(--accent)" : "var(--border)",
                  color: period === p ? "#fff" : "var(--muted-foreground)",
                  border: `1px solid ${period === p ? "var(--accent)" : "var(--border-strong)"}`,
                }}
              >
                {p === "all" ? "Tudo" : p}
              </button>
            ))}
          </div>
        </div>
        {chartSeries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "var(--faint)", fontSize: 14, marginBottom: 12 }}>Nenhum snapshot no período selecionado.</p>
            <button type="button" onClick={() => openCreate()} style={{ color: "var(--accent)", background: "transparent", border: "none", cursor: "pointer", fontSize: 14 }}>
              Registrar primeira métrica
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" />
              <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} stroke="var(--border-strong)" width={48} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--muted-foreground)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {chartPlataformas.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} name={plataformaLabels[p] || p}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabela */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Histórico</h2>
          <select
            value={filtroConta}
            onChange={(e) => setFiltroConta(e.target.value)}
            style={{ ...input, width: "auto", minWidth: 180 }}
          >
            <option value="all">Todas as contas</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{plataformaLabels[c.plataforma]} @{c.handle}</option>
            ))}
          </select>
        </div>

        {filteredSnapshots.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14, textAlign: "center", padding: "32px 0" }}>
            Nenhum registro. Use &quot;Registrar métrica&quot; para começar.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--faint)", textAlign: "left" }}>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Data</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Conta</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Seguidores</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Δ</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Engaj.</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Posts</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Receita</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredSnapshots.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 8px", color: "var(--foreground)" }}>{row.data.split("-").reverse().join("/")}</td>
                    <td style={{ padding: "10px 8px", color: "var(--muted-foreground)" }}>{plataformaLabels[row.plataforma]} @{row.handle}</td>
                    <td style={{ padding: "10px 8px", color: "var(--foreground)", fontWeight: 600 }}>{row.seguidores.toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "10px 8px", color: deltaColor(row.delta), fontWeight: 600 }}>{formatDelta(row.delta)}</td>
                    <td style={{ padding: "10px 8px", color: "var(--muted-foreground)" }}>{row.engajamento != null ? `${row.engajamento}%` : "—"}</td>
                    <td style={{ padding: "10px 8px", color: "var(--muted-foreground)" }}>{row.postsPublicados}</td>
                    <td style={{ padding: "10px 8px", color: "var(--muted-foreground)" }}>{row.receitaDia != null ? formatCurrency(row.receitaDia) : "—"}</td>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                      <button type="button" onClick={() => openEdit(row)} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, marginRight: 8 }}>Editar</button>
                      <button type="button" onClick={() => setDeleteId(row.id)} style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 12 }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal registrar / editar */}
      {modal && (
        <div
          onClick={() => !saving && setModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 50 }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
            style={{ width: "100%", maxWidth: 480, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
                {modal.type === "edit" ? "Editar snapshot" : "Registrar métrica"}
              </h2>
              <button type="button" onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {modal.type === "create" && (
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Conta</label>
                <select style={input} value={contaId} onChange={(e) => setContaId(e.target.value)} required>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{plataformaLabels[c.plataforma]} @{c.handle}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label}>Data</label>
                <input style={input} type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              <div>
                <label style={label}>Seguidores</label>
                <input style={input} type="number" min="0" value={seguidores} onChange={(e) => setSeguidores(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label}>Engajamento (%)</label>
                <input style={input} type="number" min="0" max="100" step="0.01" value={engajamento} onChange={(e) => setEngajamento(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <label style={label}>Posts publicados</label>
                <input style={input} type="number" min="0" value={postsPublicados} onChange={(e) => setPostsPublicados(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Receita do dia (R$)</label>
              <input style={input} type="number" min="0" step="0.01" value={receitaDia} onChange={(e) => setReceitaDia(e.target.value)} placeholder="Opcional" />
            </div>

            <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 12 }}>
              Data em UTC (YYYY-MM-DD). Registro no mesmo dia substitui o snapshot existente.
            </p>

            {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModal(null)} style={{ padding: "9px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 51 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
            <h3 style={{ color: "var(--foreground)", fontSize: 16, marginBottom: 8 }}>Excluir snapshot?</h3>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 16 }}>O seguidores atual da conta será recalculado com base no snapshot restante mais recente.</p>
            {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setDeleteId(null); setError(null) }} style={{ padding: "8px 14px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={confirmDelete} disabled={saving} style={{ padding: "8px 14px", background: "var(--danger)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, cursor: "pointer" }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
