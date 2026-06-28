"use client"

import { useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

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
  IDEIA: "#60a5fa", EXPERIMENTO: "#a78bfa", PROJETO: "#34d399",
  TENDENCIA: "#fbbf24", APRENDIZADO: "#f87171",
}
const STATUS_LABELS: Record<string, string> = {
  EM_ABERTO: "Em aberto", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", DESCARTADO: "Descartado",
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "#0a0a0f", border: "1px solid #2d2d3f",
  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 5 }

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
      const res = await fetch(isEdit ? `/api/discovery/${modal.id}` : "/api/discovery", {
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
    const res = await fetch(`/api/discovery/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) router.refresh()
  }

  function card(entry: Entry, draggable = false) {
    return (
      <div
        key={entry.id}
        draggable={draggable}
        onDragStart={() => setDragId(entry.id)}
        onDragEnd={() => setDragId(null)}
        onClick={() => setModal(entry)}
        style={{
          background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 10, padding: 14,
          marginBottom: 8, cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ padding: "2px 8px", background: TIPO_COLORS[entry.tipo] + "20", color: TIPO_COLORS[entry.tipo], borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{entry.tipo}</span>
          <span style={{ color: "#64748b", fontSize: 10 }}>{formatDate(entry.data)}</span>
        </div>
        <p style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{entry.titulo}</p>
        {entry.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {entry.tags.map((t) => <span key={t} style={{ fontSize: 10, color: "#7c3aed" }}>#{t}</span>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ ...input, width: "auto" }}>
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroTag} onChange={(e) => setFiltroTag(e.target.value)} style={{ ...input, width: "auto" }}>
          <option value="">Todas as tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setView("kanban")} style={{ padding: "6px 12px", background: view === "kanban" ? "#7c3aed" : "transparent", color: view === "kanban" ? "#fff" : "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Kanban</button>
          <button onClick={() => setView("grid")} style={{ padding: "6px 12px", background: view === "grid" ? "#7c3aed" : "transparent", color: view === "grid" ? "#fff" : "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Grid</button>
          <button onClick={() => setModal("new")} style={{ padding: "6px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Nova Entrada</button>
          <input ref={obsidianRef} type="file" accept=".md" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            e.target.value = ""
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/discovery/import-obsidian", { method: "POST", body: fd })
            if (res.ok) router.refresh()
            else alert("Falha ao importar")
          }} />
          <button onClick={() => obsidianRef.current?.click()} style={{ padding: "6px 14px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Import .md</button>
        </div>
      </div>

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {STATUSES.map((status) => (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { moveStatus(dragId, status); setDragId(null) } }}
              style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 12, minHeight: 200 }}
            >
              <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{STATUS_LABELS[status]}</p>
              {filtered.filter((e) => e.status === status).map((e) => card(e, true))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map((e) => (
            <div key={e.id} onClick={() => setModal(e)} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20, cursor: "pointer" }}>
              <span style={{ padding: "2px 8px", background: TIPO_COLORS[e.tipo] + "20", color: TIPO_COLORS[e.tipo], borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{e.tipo}</span>
              <p style={{ color: "#e2e8f0", fontWeight: 600, margin: "8px 0", fontSize: 14 }}>{e.titulo}</p>
              {e.descricao && <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{e.descricao.slice(0, 120)}</p>}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div onClick={() => !saving && setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 50 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveEntry} style={{ width: "100%", maxWidth: 480, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 18 }}>{modal === "new" ? "Nova entrada" : "Editar entrada"}</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={label}>Tipo</label><select name="tipo" style={input} defaultValue={modal === "new" ? "IDEIA" : modal.tipo}>{TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label style={label}>Título</label><input name="titulo" style={input} required defaultValue={modal === "new" ? "" : modal.titulo} /></div>
              <div><label style={label}>Descrição</label><textarea name="descricao" style={{ ...input, minHeight: 80 }} defaultValue={modal === "new" ? "" : modal.descricao ?? ""} /></div>
              <div><label style={label}>Status</label><select name="status" style={input} defaultValue={modal === "new" ? "EM_ABERTO" : modal.status}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
              <div><label style={label}>Tags (vírgula)</label><input name="tags" style={input} defaultValue={modal === "new" ? "" : modal.tags.join(", ")} placeholder="trend, hook, reel" /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModal(null)} style={{ padding: "9px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: "9px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
