"use client"

import { useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormActions,
} from "@/components/ui/primitives"

type Entry = {
  id: string
  tipo: string
  titulo: string
  descricao: string | null
  status: string
  tags: string[]
  data: string
}

const TIPOS = ["IDEIA", "EXPERIMENTO", "PROJETO", "TENDENCIA", "APRENDIZADO"] as const
const STATUSES = ["EM_ABERTO", "EM_ANDAMENTO", "CONCLUIDO", "DESCARTADO"] as const

const TIPO_COLORS: Record<string, string> = {
  IDEIA: "var(--cyan)", EXPERIMENTO: "var(--accent)", PROJETO: "var(--success)",
  TENDENCIA: "var(--warning)", APRENDIZADO: "var(--danger)",
}
const STATUS_LABELS: Record<string, string> = {
  EM_ABERTO: "Em aberto", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", DESCARTADO: "Descartado",
}

export default function DiscoveryClient({ initial }: { initial: Entry[] }) {
  const router = useRouter()
  const [view, setView] = useState<"grid" | "kanban">("kanban")
  const [filtroTipo, setFiltroTipo] = useState<string>("")
  const [filtroTag, setFiltroTag] = useState<string>("")
  const [modal, setModal] = useState<Entry | "new" | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const obsidianRef = useRef<HTMLInputElement>(null)

  const allTags = useMemo(() => [...new Set(initial.flatMap((e) => e.tags))].sort(), [initial])

  const filtered = initial.filter((e) => {
    if (filtroTipo && e.tipo !== filtroTipo) return false
    if (filtroTag && !e.tags.includes(filtroTag)) return false
    return true
  })

  async function saveEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const payload = {
      tipo: fd.get("tipo") as string,
      titulo: fd.get("titulo") as string,
      descricao: (fd.get("descricao") as string) || null,
      status: fd.get("status") as string,
      tags: (fd.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean),
    }
    try {
      const isEdit = modal && modal !== "new"
      const res = await fetch(isEdit ? apiUrl(`/api/discovery/${modal.id}`) : apiUrl("/api/discovery"), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      setModal(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function moveStatus(id: string, status: string) {
    const res = await fetch(apiUrl(`/api/discovery/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) router.refresh()
  }

  function entryCard(entry: Entry, draggable = false) {
    return (
      <div
        key={entry.id}
        className="ce-surface"
        draggable={draggable}
        onDragStart={() => setDragId(entry.id)}
        onDragEnd={() => setDragId(null)}
        onClick={() => setModal(entry)}
        style={{
          background: "var(--background)", padding: 14, marginBottom: 8, cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ padding: "2px 8px", background: TIPO_COLORS[entry.tipo] + "20", color: TIPO_COLORS[entry.tipo], borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{entry.tipo}</span>
          <span style={{ color: "var(--faint)", fontSize: 10 }}>{formatDate(entry.data)}</span>
        </div>
        <p style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 13 }}>{entry.titulo}</p>
        {entry.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {entry.tags.map((t) => <span key={t} style={{ fontSize: 10, color: "var(--accent)" }}>#{t}</span>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ width: "auto" }}>
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={filtroTag} onChange={(e) => setFiltroTag(e.target.value)} style={{ width: "auto" }}>
          <option value="">Todas as tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button type="button" variant={view === "kanban" ? "primary" : "ghost"} onClick={() => setView("kanban")} style={{ padding: "6px 12px", fontSize: 12 }}>Kanban</Button>
          <Button type="button" variant={view === "grid" ? "primary" : "ghost"} onClick={() => setView("grid")} style={{ padding: "6px 12px", fontSize: 12 }}>Grid</Button>
          <Button type="button" onClick={() => setModal("new")} style={{ padding: "6px 14px", fontSize: 12 }}>+ Nova Entrada</Button>
          <input ref={obsidianRef} type="file" accept=".md" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            e.target.value = ""
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch(apiUrl("/api/discovery/import-obsidian"), { method: "POST", body: fd })
            if (res.ok) router.refresh()
            else alert("Falha ao importar")
          }} />
          <Button type="button" variant="ghost" onClick={() => obsidianRef.current?.click()} style={{ padding: "6px 14px", fontSize: 12 }}>Import .md</Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {STATUSES.map((status) => (
            <div
              key={status}
              className="ce-surface"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { moveStatus(dragId, status); setDragId(null) } }}
              style={{ padding: 12, minHeight: 200 }}
            >
              <p style={{ color: "var(--muted-foreground)", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{STATUS_LABELS[status]}</p>
              {filtered.filter((e) => e.status === status).map((e) => entryCard(e, true))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map((e) => (
            <div key={e.id} className="ce-surface" onClick={() => setModal(e)} style={{ padding: 20, cursor: "pointer" }}>
              <span style={{ padding: "2px 8px", background: TIPO_COLORS[e.tipo] + "20", color: TIPO_COLORS[e.tipo], borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{e.tipo}</span>
              <p style={{ color: "var(--foreground)", fontWeight: 600, margin: "8px 0", fontSize: 14 }}>{e.titulo}</p>
              {e.descricao && <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.5 }}>{e.descricao.slice(0, 120)}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => !saving && setModal(null)} maxWidth="30rem">
        {modal && (
          <form onSubmit={saveEntry}>
            <ModalHeader title={modal === "new" ? "Nova entrada" : "Editar entrada"} onClose={() => !saving && setModal(null)} />

            <Field label="Tipo">
              <Select name="tipo" defaultValue={modal === "new" ? "IDEIA" : modal.tipo}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Título">
              <Input name="titulo" required defaultValue={modal === "new" ? "" : modal.titulo} />
            </Field>
            <Field label="Descrição">
              <Textarea name="descricao" style={{ minHeight: 80 }} defaultValue={modal === "new" ? "" : modal.descricao ?? ""} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={modal === "new" ? "EM_ABERTO" : modal.status}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </Select>
            </Field>
            <Field label="Tags (vírgula)">
              <Input name="tags" defaultValue={modal === "new" ? "" : modal.tags.join(", ")} placeholder="trend, hook, reel" />
            </Field>

            <FormActions>
              <div />
              <div className="ce-form-actions-end">
                <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
              </div>
            </FormActions>
          </form>
        )}
      </Modal>
    </div>
  )
}
