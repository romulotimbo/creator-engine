"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Button, Input, Textarea, Field, Modal, ModalHeader, FormError, FormActions, Surface,
} from "@/components/ui/primitives"

type Item = {
  id: string
  fase: string
  titulo: string
  descricao: string | null
  concluido: boolean
  ordem: number
}

type ModalMode = { type: "create" } | { type: "edit"; item: Item }

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
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, margin: 0 }}>
            {done}/{total} concluídos ({total ? Math.round((done / total) * 100) : 0}%)
          </p>
          <Button type="button" onClick={openCreate}>+ Novo item</Button>
        </div>
        <div className="ce-progress-track" style={{ height: 6 }}>
          <div className="ce-progress-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} data-complete={done === total && total > 0 ? "true" : undefined} />
        </div>
        {error && !modal && !deleteId && (
          <FormError>{error}</FormError>
        )}
      </div>

      {fases.map((faseName) => (
        <section key={faseName} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {faseName}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {initial.filter((i) => i.fase === faseName).map((item) => (
              <Surface
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderColor: item.concluido ? "rgba(52,211,153,0.3)" : undefined,
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
                  <Button type="button" variant="ghost" onClick={() => openEdit(item)} style={{ padding: 0, color: "var(--accent)", border: "none", fontSize: 12 }}>
                    Editar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setDeleteId(item.id); setError(null) }} style={{ padding: 0, color: "var(--danger)", border: "none", fontSize: 12 }}>
                    Excluir
                  </Button>
                </div>
              </Surface>
            ))}
          </div>
        </section>
      ))}

      <Modal open={!!modal} onClose={() => !saving && setModal(null)} maxWidth="30rem">
        <form onSubmit={save}>
          <ModalHeader
            title={modal?.type === "edit" ? "Editar item" : "Novo item"}
            onClose={() => !saving && setModal(null)}
          />

          <Field label="Fase">
            <Input list="fases-datalist" value={fase} onChange={(e) => setFase(e.target.value)} required />
            <datalist id="fases-datalist">
              {fases.map((f) => <option key={f} value={f} />)}
            </datalist>
          </Field>

          <Field label="Título">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </Field>

          <Field label="Descrição">
            <Textarea style={{ minHeight: 72 }} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>

          <Field label={modal?.type === "create" ? "Ordem (opcional — auto se vazio)" : "Ordem"}>
            <Input type="number" min="0" value={ordem} onChange={(e) => setOrdem(e.target.value)} placeholder="Automático" />
          </Field>

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
        <ModalHeader title="Excluir item?" onClose={() => !saving && setDeleteId(null)} />
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 16 }}>Esta ação não pode ser desfeita.</p>
        {error && <FormError>{error}</FormError>}
        <FormActions>
          <div />
          <div className="ce-form-actions-end">
            <Button type="button" variant="ghost" onClick={() => { setDeleteId(null); setError(null) }}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={confirmDelete} disabled={saving}>Excluir</Button>
          </div>
        </FormActions>
      </Modal>
    </div>
  )
}
