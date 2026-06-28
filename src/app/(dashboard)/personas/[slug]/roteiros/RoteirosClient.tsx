"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { POST_STATUS_LABELS, TIPO_POST_LABELS, PILAR_LABELS, PLATAFORMA_LABELS, checkPromptBlacklist } from "@/lib/utils"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface,
} from "@/components/ui/primitives"

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
  PENDENTE: "var(--faint)", APROVADO: "var(--cyan)", AGENDADO: "var(--accent)", PUBLICADO: "var(--success)", REJEITADO: "var(--danger)",
}

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
      <div className="ce-page-header-actions" style={{ justifyContent: "flex-end", marginBottom: "var(--space-md)" }}>
        <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={onPickFile} />
        <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={importing}>
          {importing ? "Importando..." : "⭳ Importar XLSX"}
        </Button>
        <a href={`/api/posts/export?personaId=${personaId}`} className="ce-export-link">
          ⭱ Exportar XLSX
        </a>
        <Button onClick={openNew}>+ Novo Roteiro</Button>
      </div>

      <Surface className="ce-data-table" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Tipo", "Pilar", "Título", "Status", "Data", ""].map((h) => (
                <th key={h} className="ce-kicker" style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.65rem" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialPosts.map((p, i) => (
              <tr key={p.id} onClick={() => openEdit(p)} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", background: "var(--border)", borderRadius: 4, fontSize: 12, color: "var(--muted-foreground)" }}>{TIPO_POST_LABELS[p.tipo]}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>{PILAR_LABELS[p.pilar]?.split(" ")[0]}</td>
                <td style={{ padding: "12px 16px", color: "var(--foreground)", fontSize: 13, maxWidth: 280 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{p.titulo}</span>
                </td>
                <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={p.status}
                    disabled={rowBusy === p.id}
                    onChange={(e) => changeStatus(p, e.target.value)}
                    style={{
                      padding: "3px 8px", borderRadius: 20, fontSize: 12, fontWeight: 600, width: "auto",
                      background: statusColors[p.status] + "20", color: statusColors[p.status],
                      border: `1px solid ${statusColors[p.status]}40`, cursor: "pointer",
                    }}
                  >
                    {Object.entries(POST_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k} style={{ background: "var(--surface)", color: "var(--foreground)" }}>{v}</option>
                    ))}
                  </Select>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 12 }}>
                  {p.dataPublicacao ? new Date(p.dataPublicacao).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 12 }}>editar →</td>
              </tr>
            ))}
            {initialPosts.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--faint)" }}>Nenhum roteiro cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </Surface>

      <Modal open={open} onClose={() => !saving && setOpen(false)} maxWidth="45rem">
        <form onSubmit={save}>
          <ModalHeader title={editing ? "Editar roteiro" : "Novo roteiro"} onClose={() => !saving && setOpen(false)} />

          <div className="ce-form-grid" data-cols="3">
            <Field label="Tipo">
              <Select value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                {Object.entries(TIPO_POST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Pilar">
              <Select value={form.pilar} onChange={(e) => set("pilar", e.target.value)}>
                {Object.entries(PILAR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {Object.entries(POST_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Título *">
            <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
          </Field>

          <div className="ce-form-grid" data-cols="3">
            <Field label="Conta">
              <Select value={form.contaId || ""} onChange={(e) => set("contaId", e.target.value || null)}>
                <option value="">—</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{PLATAFORMA_LABELS[c.plataforma]} · {c.handle}</option>)}
              </Select>
            </Field>
            <Field label="Música sugerida">
              <Input value={form.musicaSugerida || ""} onChange={(e) => set("musicaSugerida", e.target.value)} />
            </Field>
            <Field label="Data de publicação">
              <Input type="datetime-local" value={toLocalInput(form.dataPublicacao)} onChange={(e) => set("dataPublicacao", e.target.value || null)} />
            </Field>
          </div>

          {TEXT_FIELDS.map(([key, lbl]) => (
            <Field key={key} label={lbl}>
              <Textarea style={{ minHeight: 52 }} value={(form[key] as string) || ""} onChange={(e) => set(key, e.target.value as any)} />
              {key === "promptIa" && promptWarn.length > 0 && (
                <p style={{ color: "var(--warning)", fontSize: 12, marginTop: 4 }}>
                  ⚠ RN-02: o prompt contém termos físicos ({promptWarn.join(", ")}). Evite descrições de aparência.
                </p>
              )}
            </Field>
          ))}

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div>
              {editing && (
                <Button type="button" variant="danger" onClick={remove} disabled={saving}>Excluir</Button>
              )}
            </div>
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </FormActions>
        </form>
      </Modal>
    </>
  )
}
