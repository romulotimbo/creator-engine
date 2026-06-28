"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CATEGORIA_PROMPT_LABELS, checkPromptBlacklist } from "@/lib/utils"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type Exemplo = { url: string; personaUsada: string | null }
type Prompt = {
  id: string; titulo: string; ferramenta: string | null; categoria: string
  prompt: string; negativoPrompt: string | null; parametros: any; estiloBase: string | null
  avaliacaoMedia: number | null; usos: number; tags: string[]; imagens: Exemplo[]
}

const CAT_COLOR: Record<string, string> = { PERSONAGEM: "var(--accent)", CENARIO: "var(--cyan)", PRODUTO: "var(--warning)", VIDEO: "var(--success)", UPSCALE: "oklch(0.68 0.2 350)" }

function emptyForm(): Prompt {
  return { id: "", titulo: "", ferramenta: "", categoria: "PERSONAGEM", prompt: "", negativoPrompt: "", parametros: null, estiloBase: "", avaliacaoMedia: null, usos: 0, tags: [], imagens: [] }
}

export default function PromptsClient({ initial, personas }: { initial: Prompt[]; personas: { id: string; slug: string }[] }) {
  const router = useRouter()
  const [fCategoria, setFCategoria] = useState("")
  const [fFerramenta, setFFerramenta] = useState("")
  const [open, setOpen] = useState(false)
  const [usarPost, setUsarPost] = useState<Prompt | null>(null)
  const [usarPersonaId, setUsarPersonaId] = useState("")
  const [usarPostId, setUsarPostId] = useState("")
  const [postsOpts, setPostsOpts] = useState<{ id: string; titulo: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [form, setForm] = useState<Prompt>(emptyForm())
  const [tagsText, setTagsText] = useState("")
  const [exemplos, setExemplos] = useState<Exemplo[]>([])
  const [paramsText, setParamsText] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editing = !!form.id

  const ferramentas = useMemo(() => [...new Set(initial.map((p) => p.ferramenta).filter(Boolean))] as string[], [initial])
  const filtered = initial.filter((p) =>
    (!fCategoria || p.categoria === fCategoria) && (!fFerramenta || p.ferramenta === fFerramenta))

  const blWarn = checkPromptBlacklist(form.prompt)

  function openNew() { setForm(emptyForm()); setTagsText(""); setExemplos([]); setParamsText(""); setError(null); setOpen(true) }
  function openEdit(p: Prompt) {
    setForm({ ...p }); setTagsText(p.tags.join(", ")); setExemplos(p.imagens.map((i) => ({ ...i })))
    setParamsText(p.parametros ? JSON.stringify(p.parametros, null, 2) : ""); setError(null); setOpen(true)
  }
  function set<K extends keyof Prompt>(k: K, v: Prompt[K]) { setForm((s) => ({ ...s, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    let parametros: any = undefined
    if (paramsText.trim()) {
      try { parametros = JSON.parse(paramsText) } catch { setError("Parâmetros não são um JSON válido."); return }
    }
    setSaving(true)
    try {
      const payload: any = {
        titulo: form.titulo, ferramenta: form.ferramenta || null, categoria: form.categoria,
        prompt: form.prompt, negativoPrompt: form.negativoPrompt || null, parametros,
        estiloBase: form.estiloBase || null,
        avaliacaoMedia: form.avaliacaoMedia === null || (form.avaliacaoMedia as any) === "" ? null : form.avaliacaoMedia,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        imagens: exemplos.filter((x) => x.url.trim()),
      }
      const res = await fetch(editing ? `/api/prompts/${form.id}` : "/api/prompts", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.") }
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove() {
    if (!editing || !confirm("Excluir este prompt?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/prompts/${form.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function importFromPosts() {
    setImporting(true)
    try {
      const res = await fetch("/api/prompts/import", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha")
      alert(`Importados: ${data.imported}, ignorados: ${data.skipped}`)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setImporting(false)
    }
  }

  async function loadPosts(personaId: string) {
    setUsarPersonaId(personaId)
    const res = await fetch(`/api/posts?personaId=${personaId}&status=PENDENTE`)
    const data = await res.json()
    setPostsOpts(Array.isArray(data) ? data.map((p: any) => ({ id: p.id, titulo: p.titulo })) : [])
  }

  async function aplicarEmPost() {
    if (!usarPost || !usarPostId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/prompts/${usarPost.id}/usar-em-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: usarPostId }),
      })
      if (!res.ok) throw new Error("Falha ao aplicar prompt")
      setUsarPost(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <Select style={{ width: "auto" }} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIA_PROMPT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select style={{ width: "auto" }} value={fFerramenta} onChange={(e) => setFFerramenta(e.target.value)}>
          <option value="">Todas as ferramentas</option>
          {ferramentas.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
        <div style={{ flex: 1 }} />
        <Button type="button" variant="ghost" onClick={importFromPosts} disabled={importing}>
          {importing ? "Importando…" : "Importar dos roteiros"}
        </Button>
        <Button type="button" onClick={openNew}>+ Novo prompt</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>Nenhum prompt encontrado.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((p) => {
            const c = CAT_COLOR[p.categoria]
            return (
              <Surface key={p.id} style={{ padding: 16 }}>
                <div onClick={() => openEdit(p)} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ padding: "2px 8px", background: c + "20", color: c, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{CATEGORIA_PROMPT_LABELS[p.categoria]}</span>
                    {p.ferramenta && <span style={{ color: "var(--faint)", fontSize: 11 }}>{p.ferramenta}</span>}
                  </div>
                  <p style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{p.titulo}</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.5, maxHeight: 54, overflow: "hidden" }}>{p.prompt}</p>
                  {p.imagens.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {p.imagens.slice(0, 4).map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={img.url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border-strong)" }} />
                      ))}
                    </div>
                  )}
                  {p.tags.length > 0 && <p style={{ color: "var(--faint)", fontSize: 11, marginTop: 10 }}>{p.tags.map((t) => `#${t}`).join(" ")}</p>}
                </div>
                <Button type="button" variant="ghost" onClick={() => { setUsarPost(p); setUsarPostId(""); setPostsOpts([]) }} style={{ marginTop: 10, fontSize: 11, padding: "4px 10px" }}>
                  Usar em post
                </Button>
              </Surface>
            )
          })}
        </div>
      )}

      <Modal open={!!usarPost} onClose={() => setUsarPost(null)} maxWidth="25rem">
        {usarPost && (
          <>
            <ModalHeader title={`Usar em post — ${usarPost.titulo}`} onClose={() => setUsarPost(null)} />
            <Field label="Persona">
              <Select value={usarPersonaId} onChange={(e) => loadPosts(e.target.value)}>
                <option value="">Selecione persona</option>
                {personas.map((p) => <option key={p.id} value={p.id}>@{p.slug}</option>)}
              </Select>
            </Field>
            <Field label="Post pendente">
              <Select value={usarPostId} onChange={(e) => setUsarPostId(e.target.value)} disabled={!usarPersonaId}>
                <option value="">Post pendente</option>
                {postsOpts.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </Select>
            </Field>
            <FormActions>
              <div />
              <div className="ce-form-actions-end">
                <Button type="button" variant="ghost" onClick={() => setUsarPost(null)}>Cancelar</Button>
                <Button type="button" onClick={aplicarEmPost} disabled={!usarPostId || saving}>Aplicar</Button>
              </div>
            </FormActions>
          </>
        )}
      </Modal>

      <Modal open={open} onClose={() => !saving && setOpen(false)} maxWidth="40rem">
        <form onSubmit={save}>
          <ModalHeader title={editing ? "Editar prompt" : "Novo prompt"} onClose={() => !saving && setOpen(false)} />

          <div className="ce-form-grid" data-cols="3">
            <Field label="Título *">
              <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
            </Field>
            <Field label="Categoria">
              <Select value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                {Object.entries(CATEGORIA_PROMPT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Ferramenta">
              <Input value={form.ferramenta ?? ""} onChange={(e) => set("ferramenta", e.target.value)} placeholder="magnific..." />
            </Field>
          </div>

          <Field label="Prompt *">
            <Textarea style={{ minHeight: 80 }} value={form.prompt} onChange={(e) => set("prompt", e.target.value)} required />
            {blWarn.length > 0 && (
              <p style={{ color: "var(--warning)", fontSize: 12, marginTop: 4 }}>⚠ RN-02: contém termos de aparência ({blWarn.join(", ")}). Prompts globais não devem descrever o físico da persona.</p>
            )}
          </Field>

          <Field label="Prompt negativo">
            <Textarea style={{ minHeight: 48 }} value={form.negativoPrompt ?? ""} onChange={(e) => set("negativoPrompt", e.target.value)} />
          </Field>

          <div className="ce-form-grid" data-cols="3">
            <Field label="Estilo base">
              <Input value={form.estiloBase ?? ""} onChange={(e) => set("estiloBase", e.target.value)} />
            </Field>
            <Field label="Avaliação (0-5)">
              <Input type="number" step="0.1" min="0" max="5" value={form.avaliacaoMedia ?? ""} onChange={(e) => set("avaliacaoMedia", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
            <Field label="Tags (vírgula)">
              <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </Field>
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="ce-label">Exemplos (URL da imagem + persona)</span>
              <Button type="button" variant="ghost" onClick={() => setExemplos((e) => [...e, { url: "", personaUsada: "" }])} style={{ padding: "4px 10px", fontSize: 12 }}>
                + Exemplo
              </Button>
            </div>
            {exemplos.map((ex, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 6 }}>
                <Input value={ex.url} onChange={(e) => setExemplos((xs) => xs.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))} placeholder="https://.../img.png" />
                <Input value={ex.personaUsada ?? ""} onChange={(e) => setExemplos((xs) => xs.map((x, idx) => idx === i ? { ...x, personaUsada: e.target.value } : x))} placeholder="slug persona" />
                <Button type="button" variant="ghost" onClick={() => setExemplos((xs) => xs.filter((_, idx) => idx !== i))}>✕</Button>
              </div>
            ))}
          </div>

          <Field label="Parâmetros (JSON opcional)">
            <Textarea style={{ minHeight: 44, fontFamily: "monospace", fontSize: 12 }} value={paramsText} onChange={(e) => setParamsText(e.target.value)} placeholder='{"steps": 30}' />
          </Field>

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div>
              {editing && (
                <Button type="button" variant="danger" onClick={remove} disabled={saving}>Excluir</Button>
              )}
            </div>
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </FormActions>
        </form>
      </Modal>
    </>
  )
}
