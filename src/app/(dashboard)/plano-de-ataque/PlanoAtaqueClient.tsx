"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Item = {
  id: string
  fase: string
  titulo: string
  descricao: string | null
  concluido: boolean
  ordem: number
}

type ModalMode = { type: "create" } | { type: "edit"; item: Item }

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }

export default function PlanoAtaqueClient({ initial }: { initial: Item[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [fase, setFase] = useState("")
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [ordem, setOrdem] = useState("")

  const fases = [...new Set(initial.map((i) => i.fase))]
  const total = initial.length
  const done = initial.filter((i) => i.concluido).length

  function openCreate() {
    setModal({ type: "create" })
    setError(null)
    setFase(fases[0] ?? "")
    setTitulo("")
    setDescricao("")
    setOrdem("")
  }

  function openEdit(item: Item) {
    setModal({ type: "edit", item })
    setError(null)
    setFase(item.fase)
    setTitulo(item.titulo)
    setDescricao(item.descricao ?? "")
    setOrdem(String(item.ordem))
  }

  async function toggle(item: Item) {
    setBusy(item.id)
    setError(null)
    try {
      const res = await fetch(`/api/plano-de-ataque/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluido: !item.concluido }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao atualizar")
      }
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar")
    } finally {
      setBusy(null)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fase.trim() || !titulo.trim()) {
      setError("Fase e título são obrigatórios.")
      return
    }

    const payload = {
      fase: fase.trim(),
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      ...(modal?.type === "edit" || ordem ? { ordem: ordem ? Number(ordem) : undefined } : {}),
    }

    setSaving(true)
    try {
      const isEdit = modal?.type === "edit"
      const res = await fetch(
        isEdit ? `/api/plano-de-ataque/${modal.item.id}` : "/api/plano-de-ataque",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? { ...payload, ordem: ordem ? Number(ordem) : modal.item.ordem }
              : payload,
          ),
        },
      )
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar")

      setModal(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/plano-de-ataque/${deleteId}`, { method: "DELETE" })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao excluir")
      setDeleteId(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, margin: 0 }}>
            {done}/{total} concluídos ({total ? Math.round((done / total) * 100) : 0}%)
          </p>
          <button
            type="button"
            onClick={openCreate}
            style={{ padding: "8px 14px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Novo item
          </button>
        </div>
        <div style={{ height: 6, background: "var(--border)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${total ? (done / total) * 100 : 0}%`, background: "var(--accent)", transition: "width 0.3s" }} />
        </div>
        {error && !modal && !deleteId && (
          <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>
        )}
      </div>

      {fases.map((faseName) => (
        <section key={faseName} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {faseName}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {initial.filter((i) => i.fase === faseName).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  background: "var(--surface)",
                  border: `1px solid ${item.concluido ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
                  borderRadius: 10,
                  opacity: item.concluido ? 0.75 : 1,
                }}
              >
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => toggle(item)}
                  aria-label={item.concluido ? "Marcar pendente" : "Marcar concluído"}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    flexShrink: 0,
                    marginTop: 2,
                    background: item.concluido ? "var(--success)" : "var(--border)",
                    border: "1px solid var(--border-strong)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "var(--background)",
                    cursor: busy === item.id ? "wait" : "pointer",
                  }}
                >
                  {item.concluido ? "✓" : ""}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: item.concluido ? "var(--faint)" : "var(--foreground)", fontWeight: 600, fontSize: 14, textDecoration: item.concluido ? "line-through" : "none" }}>
                    {item.titulo}
                  </p>
                  {item.descricao && (
                    <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 4 }}>{item.descricao}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer" }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteId(item.id); setError(null) }}
                    style={{ background: "transparent", border: "none", color: "var(--danger)", fontSize: 12, cursor: "pointer" }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                {modal.type === "edit" ? "Editar item" : "Novo item"}
              </h2>
              <button type="button" onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Fase</label>
              <input
                style={input}
                list="fases-datalist"
                value={fase}
                onChange={(e) => setFase(e.target.value)}
                required
              />
              <datalist id="fases-datalist">
                {fases.map((f) => <option key={f} value={f} />)}
              </datalist>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Título</label>
              <input style={input} value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Descrição</label>
              <textarea
                style={{ ...input, minHeight: 72, resize: "vertical" }}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Ordem {modal.type === "create" && "(opcional — auto se vazio)"}</label>
              <input style={input} type="number" min="0" value={ordem} onChange={(e) => setOrdem(e.target.value)} placeholder="Automático" />
            </div>

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

      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 51 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
            <h3 style={{ color: "var(--foreground)", fontSize: 16, marginBottom: 8 }}>Excluir item?</h3>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 16 }}>Esta ação não pode ser desfeita.</p>
            {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setDeleteId(null); setError(null) }} style={{ padding: "8px 14px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={confirmDelete} disabled={saving} style={{ padding: "8px 14px", background: "var(--danger)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, cursor: "pointer" }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
