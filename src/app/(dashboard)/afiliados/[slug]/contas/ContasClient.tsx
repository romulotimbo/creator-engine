"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api-url"
import { TIPO_CONTA_VINCULADA_LABELS } from "@/lib/afiliados"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type Conta = {
  id: string
  tipo: string
  handle: string
  status: string
  notas: string | null
}

export default function ContasVinculadasClient({
  slug,
  contas: initial,
}: {
  slug: string
  contas: Conta[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [tipo, setTipo] = useState("BRAIP")
  const [handle, setHandle] = useState("")
  const [status, setStatus] = useState("ATIVA")
  const [notas, setNotas] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(initial)
  }, [initial])

  function openNew() {
    setEditId(null)
    setTipo("BRAIP")
    setHandle("")
    setStatus("ATIVA")
    setNotas("")
    setError(null)
    setOpen(true)
  }

  function openEdit(c: Conta) {
    setEditId(c.id)
    setTipo(c.tipo)
    setHandle(c.handle)
    setStatus(c.status)
    setNotas(c.notas || "")
    setError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url = editId
        ? apiUrl(`/api/afiliados/${slug}/contas/${editId}`)
        : apiUrl(`/api/afiliados/${slug}/contas`)
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, handle, status, notas: notas || null }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar")
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  async function remove(c: Conta) {
    if (!confirm(`Excluir ${c.tipo} · ${c.handle}?`)) return
    const res = await fetch(apiUrl(`/api/afiliados/${slug}/contas/${c.id}`), { method: "DELETE" })
    if (res.ok) router.refresh()
    else alert("Falha ao excluir")
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button onClick={openNew}>+ Conta vinculada</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          <p>Nenhuma conta vinculada. Adicione Braip, e-mail, proxy, pixel…</p>
        </EmptyState>
      ) : (
        <Surface className="ce-data-table">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Tipo", "Handle", "Status", "Notas", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--faint)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px" }}>{TIPO_CONTA_VINCULADA_LABELS[c.tipo] || c.tipo}</td>
                  <td style={{ padding: "10px 12px" }}>{c.handle}</td>
                  <td style={{ padding: "10px 12px" }}>{c.status}</td>
                  <td style={{ padding: "10px 12px", color: "var(--muted)", fontSize: 13 }}>{c.notas || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <Button variant="ghost" onClick={() => openEdit(c)}>Editar</Button>
                    <Button variant="ghost" onClick={() => remove(c)}>Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      )}

      {open && (
        <Modal open={open} onClose={() => setOpen(false)}>
          <form onSubmit={save}>
            <ModalHeader title={editId ? "Editar conta" : "Nova conta vinculada"} onClose={() => setOpen(false)} />
            <Field label="Tipo">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {Object.entries(TIPO_CONTA_VINCULADA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Handle / ID">
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} required />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ATIVA">Ativa</option>
                <option value="PAUSADA">Pausada</option>
                <option value="INATIVA">Inativa</option>
              </Select>
            </Field>
            <Field label="Notas">
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
            </Field>
            {error && <FormError>{error}</FormError>}
            <FormActions>
              <Button type="submit" disabled={saving}>{saving ? "…" : "Salvar"}</Button>
            </FormActions>
          </form>
        </Modal>
      )}
    </>
  )
}
