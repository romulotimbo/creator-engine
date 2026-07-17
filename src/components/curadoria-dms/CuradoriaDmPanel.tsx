"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CuradoriaDmRow, CuradoriaWindowSort } from "@/lib/curadoria-dms-shared"
import { apiUrl } from "@/lib/api-url"
import {
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  Surface,
} from "@/components/ui/primitives"
import CuradoriaDmTable from "@/components/curadoria-dms/CuradoriaDmTable"
import CuradoriaDmHistoricoModal from "@/components/curadoria-dms/CuradoriaDmHistoricoModal"
import CuradoriaDmBatchBar, {
  formatBatchSummary,
  type BatchFailure,
} from "@/components/curadoria-dms/CuradoriaDmBatchBar"
import { tk } from "@/lib/tokens"

const POLL_MS = 20_000
const BLUR_DEBOUNCE_MS = 300

const STATUS_OPTIONS = [
  { value: "pending_review", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "sent", label: "Enviado" },
  { value: "failed", label: "Falhou" },
  { value: "skipped", label: "Ignorado" },
  { value: "window_expired", label: "Janela expirada" },
]

type ListResponse = {
  items: CuradoriaDmRow[]
  total: number
  page: number
  limit: number
}

function defaultFinalText(row: CuradoriaDmRow): string {
  return row.finalText ?? row.draftText ?? ""
}

export default function CuradoriaDmPanel() {
  const [items, setItems] = useState<CuradoriaDmRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [status, setStatus] = useState("pending_review")
  const [username, setUsername] = useState("")
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [draftTexts, setDraftTexts] = useState<Record<number, string>>({})
  const [selectValues, setSelectValues] = useState<Record<number, string>>({})
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  const [editingRowIds, setEditingRowIds] = useState<Set<number>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [historicoRow, setHistoricoRow] = useState<CuradoriaDmRow | null>(null)
  const [windowSort, setWindowSort] = useState<CuradoriaWindowSort>("asc")
  const [pageInput, setPageInput] = useState("1")
  const blurTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const selectedRows = useMemo(
    () => items.filter((r) => selectedIds.has(r.id)),
    [items, selectedIds],
  )

  const pollPaused = savingIds.size > 0 || historicoRow !== null

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    setError(null)
    setNotConfigured(false)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status,
      sortWindow: windowSort,
    })
    if (username.trim()) params.set("username", username.trim())
    if (q.trim()) params.set("q", q.trim())

    try {
      const res = await fetch(apiUrl(`/api/curadoria-dms?${params}`))
      if (res.status === 503) {
        setNotConfigured(true)
        setItems([])
        setTotal(0)
        return
      }
      const data: ListResponse & { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar lista")
      setItems(data.items)
      setTotal(data.total)
      setSelectedIds((prev) => {
        const next = new Set<number>()
        for (const id of prev) {
          if (data.items.some((r) => r.id === id)) next.add(id)
        }
        return next
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao carregar.")
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [page, limit, status, username, q, windowSort])

  function toggleWindowSort() {
    setWindowSort((prev) => (prev === "asc" ? "desc" : "asc"))
    setPage(1)
  }

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && !pollPaused) {
        load({ silent: true })
      }
    }
    const id = window.setInterval(tick, POLL_MS)
    return () => window.clearInterval(id)
  }, [load, pollPaused])

  useEffect(() => {
    return () => {
      for (const timer of blurTimers.current.values()) {
        clearTimeout(timer)
      }
    }
  }, [])

  function toggleId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(items.map((r) => r.id)) : new Set())
  }

  function handleFinalTextChange(id: number, text: string) {
    setDraftTexts((prev) => ({ ...prev, [id]: text }))
    setRowErrors((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleRowFocus(id: number) {
    const existing = blurTimers.current.get(id)
    if (existing) {
      clearTimeout(existing)
      blurTimers.current.delete(id)
    }
    setEditingRowIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  function handleRowBlur(id: number) {
    const existing = blurTimers.current.get(id)
    if (existing) clearTimeout(existing)
    blurTimers.current.set(
      id,
      setTimeout(() => {
        blurTimers.current.delete(id)
        setEditingRowIds((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, BLUR_DEBOUNCE_MS),
    )
  }

  function clearRowLocalState(id: number) {
    setDraftTexts((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSelectValues((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setRowErrors((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setEditingRowIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  async function handleStatusChange(id: number, decision: "approved" | "rejected") {
    const row = items.find((r) => r.id === id)
    if (!row || row.status !== "pending_review") return

    const finalText = draftTexts[id] ?? defaultFinalText(row)

    setSelectValues((prev) => ({ ...prev, [id]: decision }))
    setRowErrors((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSavingIds((prev) => new Set(prev).add(id))

    try {
      const freshRes = await fetch(apiUrl(`/api/curadoria-dms/${id}`))
      const freshData = await freshRes.json().catch(() => ({}))
      if (!freshRes.ok) {
        throw new Error(
          typeof freshData.error === "string" ? freshData.error : "Falha ao recarregar registro.",
        )
      }
      if (freshData.status !== "pending_review") {
        throw new Error("Este registro já foi curado. Recarregue a lista.")
      }

      const res = await fetch(apiUrl(`/api/curadoria-dms/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalText,
          status: decision,
          expectedUpdatedAt: freshData.updatedAt,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        setSelectValues((prev) => ({ ...prev, [id]: "pending_review" }))
        setRowErrors((prev) => ({
          ...prev,
          [id]: "Registro alterado por outro operador. Recarregue e tente novamente.",
        }))
        await load({ silent: true })
        return
      }

      if (!res.ok) {
        setSelectValues((prev) => ({ ...prev, [id]: "pending_review" }))
        throw new Error(typeof data.error === "string" ? data.error : "Falha ao salvar curadoria.")
      }

      clearRowLocalState(id)
      await load({ silent: true })
    } catch (err: unknown) {
      setSelectValues((prev) => ({ ...prev, [id]: "pending_review" }))
      setRowErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Falha ao salvar.",
      }))
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function runBatch(action: "approved" | "rejected") {
    if (selectedRows.length === 0) return
    const label = action === "approved" ? "aprovar" : "rejeitar"
    if (!confirm(`${label} ${selectedRows.length} registro(s)?`)) return

    setBatchBusy(true)
    try {
      const res = await fetch(apiUrl("/api/curadoria-dms/lote"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          items: selectedRows.map((r) => ({
            id: r.id,
            expectedUpdatedAt: r.updatedAt,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha no lote")

      const failed = (data.failed ?? []) as BatchFailure[]
      alert(
        formatBatchSummary((data.succeeded ?? []).length, failed),
      )
      setSelectedIds(new Set())
      await load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Falha no lote.")
    } finally {
      setBatchBusy(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  function goToPageInput() {
    const n = Number.parseInt(pageInput, 10)
    if (!Number.isFinite(n)) return
    const clamped = Math.min(totalPages, Math.max(1, n))
    setPageInput(String(clamped))
    if (clamped !== page) setPage(clamped)
  }

  if (notConfigured) {
    return (
      <EmptyState>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Conexão n8n não configurada</p>
        <p style={{ color: tk.muted, fontSize: "var(--text-sm)" }}>
          Defina <code>N8N_POSTGRES_URL</code> no ambiente da API e execute{" "}
          <code>prisma/sql/09-curadoria-dms-grants.sql</code> no Postgres.
        </p>
      </EmptyState>
    )
  }

  return (
    <div className="ce-animate-in">
      <Surface style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
            alignItems: "end",
          }}
        >
          <Field label="Status">
            <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@seguidor"
            />
          </Field>
          <Field label="Busca no contexto">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Texto livre"
            />
          </Field>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button onClick={() => { setPage(1); load() }}>Filtrar</Button>
            <Button variant="ghost" onClick={() => load()}>
              Recarregar
            </Button>
          </div>
        </div>
      </Surface>

      <CuradoriaDmBatchBar
        count={selectedIds.size}
        busy={batchBusy}
        onApprove={() => runBatch("approved")}
        onReject={() => runBatch("rejected")}
        onClear={() => setSelectedIds(new Set())}
      />

      {error && (
        <p className="ce-error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {loading ? (
        <EmptyState>Carregando rascunhos…</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>
          Nenhum rascunho encontrado para os filtros atuais.
        </EmptyState>
      ) : (
        <CuradoriaDmTable
          items={items}
          selectedIds={selectedIds}
          savingIds={savingIds}
          draftTexts={draftTexts}
          selectValues={selectValues}
          rowErrors={rowErrors}
          onToggle={toggleId}
          onToggleAll={toggleAll}
          onFinalTextChange={handleFinalTextChange}
          onStatusChange={handleStatusChange}
          onRowFocus={handleRowFocus}
          onRowBlur={handleRowBlur}
          onOpenHistorico={setHistoricoRow}
          windowSort={windowSort}
          onToggleWindowSort={toggleWindowSort}
        />
      )}

      <CuradoriaDmHistoricoModal
        row={historicoRow}
        open={historicoRow !== null}
        onClose={() => setHistoricoRow(null)}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1rem",
          fontSize: "var(--text-sm)",
          color: tk.muted,
        }}
      >
        <span>
          {total} registro(s) · página {page} de {totalPages}
        </span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Button
            variant="ghost"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            Página
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToPageInput()
              }}
              disabled={loading}
              style={{ width: "4rem", padding: "0.35rem 0.5rem", fontSize: "var(--text-sm)" }}
              aria-label="Número da página"
            />
            de {totalPages}
          </span>
          <Button variant="ghost" disabled={loading} onClick={goToPageInput}>
            Ir
          </Button>
          <Button
            variant="ghost"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
