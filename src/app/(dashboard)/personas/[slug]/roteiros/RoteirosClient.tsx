"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { POST_STATUS_LABELS, TIPO_POST_LABELS, PILAR_LABELS, PLATAFORMA_LABELS, checkPromptBlacklist } from "@/lib/utils"

type Conta = { id: string; plataforma: string; handle: string }
type Post = {
  id: string
  tipo: string; pilar: string; titulo: string; status: string
  cenario: string | null; figurino: string | null; hook: string | null; roteiro: string | null
  copyLegenda: string | null; promptIa: string | null; musicaSugerida: string | null
  hashtags: string | null; recursos: string | null; edicao: string | null
  posicaoElementos: string | null; obsProducao: string | null
  dataPublicacao: string | Date | null; contaId: string | null
}

const statusColors: Record<string, string> = {
  PENDENTE: "#7d899c", APROVADO: "#60a5fa", AGENDADO: "#a78bfa", PUBLICADO: "#34d399", REJEITADO: "#f87171",
}

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "#0a0a0f", border: "1px solid #2d2d3f",
  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 5 }

function toLocalInput(d: string | Date | null): string {
  if (!d) return ""
  const date = new Date(d)
  const off = date.getTimezoneOffset()
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16)
}

const TEXT_FIELDS: [keyof Post, string][] = [
  ["hook", "Hook"], ["cenario", "Cenário"], ["figurino", "Figurino"], ["roteiro", "Roteiro"],
  ["copyLegenda", "Copy / Legenda"], ["promptIa", "Prompt de IA"], ["hashtags", "Hashtags"],
  ["recursos", "Recursos"], ["edicao", "Edição"], ["posicaoElementos", "Posição de elementos"],
  ["obsProducao", "Observações de produção"],
]

function emptyForm(): Post {
  return {
    id: "", tipo: "IMAGEM", pilar: "IDENTIDADE", titulo: "", status: "PENDENTE",
    cenario: "", figurino: "", hook: "", roteiro: "", copyLegenda: "", promptIa: "",
    musicaSugerida: "", hashtags: "", recursos: "", edicao: "", posicaoElementos: "",
    obsProducao: "", dataPublicacao: null, contaId: null,
  }
}

export default function RoteirosClient({
  personaId, personaSlug, contas, initialPosts,
}: {
  personaId: string; personaSlug: string; contas: Conta[]; initialPosts: Post[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Post>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) e.target.value = ""
    if (!file) return
    const replace = initialPosts.length > 0
      ? confirm(`Esta persona já tem ${initialPosts.length} roteiro(s).\n\nOK = SUBSTITUIR todos pelos da planilha.\nCancelar = ADICIONAR aos existentes.`)
      : false
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("personaId", personaId)
      fd.append("replace", String(replace))
      const res = await fetch("/api/posts/import", { method: "POST", body: fd })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao importar.")
      alert(`Importação concluída: ${b.imported} roteiro(s) criado(s)${b.removed ? `, ${b.removed} removido(s)` : ""}.`)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setImporting(false)
    }
  }

  const editing = !!form.id
  const promptWarn = checkPromptBlacklist(form.promptIa)

  function openNew() { setForm(emptyForm()); setError(null); setOpen(true) }
  function openEdit(p: Post) { setForm({ ...p, dataPublicacao: p.dataPublicacao }); setError(null); setOpen(true) }
  function set<K extends keyof Post>(k: K, v: Post[K]) { setForm((f) => ({ ...f, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload: any = {
        tipo: form.tipo, pilar: form.pilar, titulo: form.titulo, status: form.status,
        cenario: form.cenario, figurino: form.figurino, hook: form.hook, roteiro: form.roteiro,
        copyLegenda: form.copyLegenda, promptIa: form.promptIa, musicaSugerida: form.musicaSugerida,
        hashtags: form.hashtags, recursos: form.recursos, edicao: form.edicao,
        posicaoElementos: form.posicaoElementos, obsProducao: form.obsProducao,
        dataPublicacao: form.dataPublicacao || null,
        contaId: form.contaId || null,
      }
      let res: Response
      if (editing) {
        res = await fetch(`/api/posts/${form.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/posts`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, personaId }),
        })
      }
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.")
      }
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(post: Post, novo: string) {
    if (novo === post.status) return
    if (novo === "PUBLICADO" && !confirm(`Publicar "${post.titulo}"? O status PUBLICADO marca o post como veiculado.`)) return
    setRowBusy(post.id)
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novo }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        alert(typeof b.error === "string" ? b.error : "Falha ao mudar status.")
        return
      }
      router.refresh()
    } finally {
      setRowBusy(null)
    }
  }

  async function remove() {
    if (!editing) return
    if (!confirm("Excluir este roteiro? Esta ação não pode ser desfeita.")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/posts/${form.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={onPickFile} />
        <button onClick={() => fileRef.current?.click()} disabled={importing}
          style={{ padding: "10px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer", opacity: importing ? 0.6 : 1 }}>
          {importing ? "Importando..." : "⭳ Importar XLSX"}
        </button>
        <button onClick={openNew} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Novo Roteiro
        </button>
      </div>

      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["#", "Tipo", "Pilar", "Título", "Status", "Data", ""].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#7d899c", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialPosts.map((p, i) => (
              <tr key={p.id} onClick={() => openEdit(p)} style={{ borderBottom: "1px solid #1e1e2e", cursor: "pointer" }}>
                <td style={{ padding: "12px 16px", color: "#7d899c", fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", background: "#1e1e2e", borderRadius: 4, fontSize: 12, color: "#94a3b8" }}>{TIPO_POST_LABELS[p.tipo]}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: 12 }}>{PILAR_LABELS[p.pilar]?.split(" ")[0]}</td>
                <td style={{ padding: "12px 16px", color: "#e2e8f0", fontSize: 13, maxWidth: 280 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{p.titulo}</span>
                </td>
                <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                  <select
                    value={p.status}
                    disabled={rowBusy === p.id}
                    onChange={(e) => changeStatus(p, e.target.value)}
                    style={{
                      padding: "3px 8px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: statusColors[p.status] + "20", color: statusColors[p.status],
                      border: `1px solid ${statusColors[p.status]}40`, cursor: "pointer", outline: "none",
                    }}
                  >
                    {Object.entries(POST_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k} style={{ background: "#111118", color: "#e2e8f0" }}>{v}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "12px 16px", color: "#7d899c", fontSize: 12 }}>
                  {p.dataPublicacao ? new Date(p.dataPublicacao).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td style={{ padding: "12px 16px", color: "#7d899c", fontSize: 12 }}>editar →</td>
              </tr>
            ))}
            {initialPosts.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "#7d899c" }}>Nenhum roteiro cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div onClick={() => !saving && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 720, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{editing ? "Editar roteiro" : "Novo roteiro"}</h2>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "#7d899c", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label}>Tipo</label>
                <select style={input} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                  {Object.entries(TIPO_POST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Pilar</label>
                <select style={input} value={form.pilar} onChange={(e) => set("pilar", e.target.value)}>
                  {Object.entries(PILAR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Status</label>
                <select style={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {Object.entries(POST_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Título *</label>
              <input style={input} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label}>Conta</label>
                <select style={input} value={form.contaId || ""} onChange={(e) => set("contaId", e.target.value || null)}>
                  <option value="">—</option>
                  {contas.map((c) => <option key={c.id} value={c.id}>{PLATAFORMA_LABELS[c.plataforma]} · {c.handle}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Música sugerida</label>
                <input style={input} value={form.musicaSugerida || ""} onChange={(e) => set("musicaSugerida", e.target.value)} />
              </div>
              <div>
                <label style={label}>Data de publicação</label>
                <input style={input} type="datetime-local" value={toLocalInput(form.dataPublicacao)} onChange={(e) => set("dataPublicacao", e.target.value || null)} />
              </div>
            </div>

            {TEXT_FIELDS.map(([key, lbl]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={label}>{lbl}</label>
                <textarea style={{ ...input, minHeight: 52, resize: "vertical" }} value={(form[key] as string) || ""} onChange={(e) => set(key, e.target.value as any)} />
                {key === "promptIa" && promptWarn.length > 0 && (
                  <p style={{ color: "#f59e0b", fontSize: 12, marginTop: 4 }}>
                    ⚠ RN-02: o prompt contém termos físicos ({promptWarn.join(", ")}). Evite descrições de aparência.
                  </p>
                )}
              </div>
            ))}

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 8, padding: "9px 12px", margin: "8px 0", fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <div>
                {editing && (
                  <button type="button" onClick={remove} disabled={saving} style={{ padding: "10px 16px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Excluir</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: "10px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
