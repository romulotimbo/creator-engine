"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import type { ContaMetrica, SnapshotRow } from "./types"
import { formatCurrency, getProgressPercent } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState, SectionTitle,
} from "@/components/ui/primitives"

const LINE_COLORS = ["var(--accent)", "var(--success)", "var(--cyan)", "var(--warning)", "var(--danger)"]

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
      const key = s.data.split("-").reverse().join("/").slice(0, 5)
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
      const url = isEdit ? apiUrl(`/api/metricas/${modal.row.id}`) : apiUrl("/api/metricas")
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
      const res = await fetch(apiUrl(`/api/metricas/${deleteId}`), { method: "DELETE" })
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
      <div className="ce-page-header-actions" style={{ justifyContent: "flex-end", marginBottom: "var(--space-lg)" }}>
        <Button onClick={() => openCreate()}>+ Registrar métrica</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: "var(--space-xl)" }}>
        {contas.map((c) => (
          <Surface key={c.id} style={{ padding: "var(--space-lg)" }}>
            <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 4 }}>{plataformaLabels[c.plataforma] || c.plataforma}</p>
            <p style={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 8 }}>@{c.handle}</p>
            <p style={{ color: "var(--foreground)", fontSize: 22, fontWeight: 700 }}>{c.seguidoresAtual.toLocaleString("pt-BR")}</p>
            <p style={{ color: deltaColor(c.delta7d), fontSize: 13, marginTop: 4 }}>
              {c.delta7d != null ? `${formatDelta(c.delta7d)} (7d)` : "Sem histórico suficiente"}
            </p>
            {c.metaSeguidores != null && c.metaSeguidores > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="ce-progress-track">
                  <div className="ce-progress-fill" style={{ width: `${getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}%` }} />
                </div>
                <p style={{ color: "var(--faint)", fontSize: 11, marginTop: 4 }}>
                  {getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}% da meta
                </p>
              </div>
            )}
            <Button type="button" variant="ghost" onClick={() => openCreate(c.id)} style={{ marginTop: 12, padding: 0, color: "var(--accent)", border: "none", background: "transparent" }}>
              Registrar →
            </Button>
          </Surface>
        ))}
      </div>

      <Surface style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <SectionTitle>Evolução de seguidores</SectionTitle>
          <div className="ce-page-header-actions" style={{ marginBottom: 0 }}>
            {(["30d", "90d", "180d", "all"] as Period[]).map((p) => (
              <Button
                key={p}
                type="button"
                variant={period === p ? "primary" : "ghost"}
                onClick={() => setPeriod(p)}
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                {p === "all" ? "Tudo" : p}
              </Button>
            ))}
          </div>
        </div>
        {chartSeries.length === 0 ? (
          <EmptyState>
            <p style={{ marginBottom: 12 }}>Nenhum snapshot no período selecionado.</p>
            <Button type="button" variant="ghost" onClick={() => openCreate()} style={{ color: "var(--accent)" }}>
              Registrar primeira métrica
            </Button>
          </EmptyState>
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
      </Surface>

      <Surface className="ce-data-table">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <SectionTitle>Histórico</SectionTitle>
          <Select
            value={filtroConta}
            onChange={(e) => setFiltroConta(e.target.value)}
            style={{ width: "auto", minWidth: 180 }}
          >
            <option value="all">Todas as contas</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{plataformaLabels[c.plataforma]} @{c.handle}</option>
            ))}
          </Select>
        </div>

        {filteredSnapshots.length === 0 ? (
          <EmptyState>
            Nenhum registro. Use &quot;Registrar métrica&quot; para começar.
          </EmptyState>
        ) : (
          <div style={{ overflowX: "auto", margin: "0 calc(-1 * var(--space-xl))", padding: "0 var(--space-xl)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--faint)", textAlign: "left" }}>
                  {["Data", "Conta", "Seguidores", "Δ", "Engaj.", "Posts", "Receita", ""].map((h) => (
                    <th key={h || "actions"} className="ce-kicker" style={{ padding: "10px 8px", fontSize: "0.65rem" }}>{h}</th>
                  ))}
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
                      <Button type="button" variant="ghost" onClick={() => openEdit(row)} style={{ padding: 0, color: "var(--accent)", border: "none", fontSize: 12, marginRight: 8 }}>Editar</Button>
                      <Button type="button" variant="ghost" onClick={() => setDeleteId(row.id)} style={{ padding: 0, color: "var(--danger)", border: "none", fontSize: 12 }}>Excluir</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <Modal open={!!modal} onClose={() => !saving && setModal(null)} maxWidth="30rem">
        <form onSubmit={save}>
          <ModalHeader
            title={modal?.type === "edit" ? "Editar snapshot" : "Registrar métrica"}
            onClose={() => !saving && setModal(null)}
          />

          {modal?.type === "create" && (
            <Field label="Conta">
              <Select value={contaId} onChange={(e) => setContaId(e.target.value)} required>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{plataformaLabels[c.plataforma]} @{c.handle}</option>
                ))}
              </Select>
            </Field>
          )}

          <div className="ce-form-grid" data-cols="2">
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </Field>
            <Field label="Seguidores">
              <Input type="number" min="0" value={seguidores} onChange={(e) => setSeguidores(e.target.value)} required />
            </Field>
          </div>

          <div className="ce-form-grid" data-cols="2">
            <Field label="Engajamento (%)">
              <Input type="number" min="0" max="100" step="0.01" value={engajamento} onChange={(e) => setEngajamento(e.target.value)} placeholder="Opcional" />
            </Field>
            <Field label="Posts publicados">
              <Input type="number" min="0" value={postsPublicados} onChange={(e) => setPostsPublicados(e.target.value)} />
            </Field>
          </div>

          <Field label="Receita do dia (R$)">
            <Input type="number" min="0" step="0.01" value={receitaDia} onChange={(e) => setReceitaDia(e.target.value)} placeholder="Opcional" />
          </Field>

          <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 12 }}>
            Data em UTC (YYYY-MM-DD). Registro no mesmo dia substitui o snapshot existente.
          </p>

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div />
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </FormActions>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => !saving && setDeleteId(null)} maxWidth="25rem">
        <ModalHeader title="Excluir snapshot?" onClose={() => !saving && setDeleteId(null)} />
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 16 }}>
          O seguidores atual da conta será recalculado com base no snapshot restante mais recente.
        </p>
        {error && <FormError>{error}</FormError>}
        <FormActions>
          <div />
          <div className="ce-form-actions-end">
            <Button type="button" variant="ghost" onClick={() => { setDeleteId(null); setError(null) }}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={confirmDelete} disabled={saving}>Excluir</Button>
          </div>
        </FormActions>
      </Modal>
    </>
  )
}
