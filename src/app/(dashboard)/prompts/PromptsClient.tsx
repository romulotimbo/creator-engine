"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CATEGORIA_PROMPT_LABELS, checkPromptBlacklist } from "@/lib/utils"

type Exemplo = { url: string; personaUsada: string | null }
type Prompt = {
  id: string; titulo: string; ferramenta: string | null; categoria: string
  prompt: string; negativoPrompt: string | null; parametros: any; estiloBase: string | null
  avaliacaoMedia: number | null; usos: number; tags: string[]; imagens: Exemplo[]
}

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "#0a0a0f", border: "1px solid #2d2d3f",
  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 5 }
const CAT_COLOR: Record<string, string> = { PERSONAGEM: "#a78bfa", CENARIO: "#60a5fa", PRODUTO: "#fbbf24", VIDEO: "#34d399", UPSCALE: "#f472b6" }

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
        <select style={{ ...input, width: "auto" }} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIA_PROMPT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={{ ...input, width: "auto" }} value={fFerramenta} onChange={(e) => setFFerramenta(e.target.value)}>
          <option value="">Todas as ferramentas</option>
          {ferramentas.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={importFromPosts} disabled={importing} style={{ padding: "10px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>{importing ? "Importando…" : "Importar dos roteiros"}</button>
        <button onClick={openNew} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Novo prompt</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 48, textAlign: "center", color: "#7d899c" }}>Nenhum prompt encontrado.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((p) => {
            const c = CAT_COLOR[p.categoria]
            return (
              <div key={p.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16 }}>
                <div onClick={() => openEdit(p)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ padding: "2px 8px", background: c + "20", color: c, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{CATEGORIA_PROMPT_LABELS[p.categoria]}</span>
                  {p.ferramenta && <span style={{ color: "#7d899c", fontSize: 11 }}>{p.ferramenta}</span>}
                </div>
                <p style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{p.titulo}</p>
                <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, maxHeight: 54, overflow: "hidden" }}>{p.prompt}</p>
                {p.imagens.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {p.imagens.slice(0, 4).map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={img.url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid #2d2d3f" }} />
                    ))}
                  </div>
                )}
                {p.tags.length > 0 && <p style={{ color: "#475569", fontSize: 11, marginTop: 10 }}>{p.tags.map((t) => `#${t}`).join(" ")}</p>}
                </div>
                <button type="button" onClick={() => { setUsarPost(p); setUsarPostId(""); setPostsOpts([]) }} style={{ marginTop: 10, padding: "4px 10px", background: "transparent", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Usar em post</button>
              </div>
            )
          })}
        </div>
      )}

      {usarPost && (
        <div onClick={() => setUsarPost(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, width: 400 }}>
            <h3 style={{ color: "#e2e8f0", marginBottom: 16 }}>Usar em post — {usarPost.titulo}</h3>
            <select style={{ ...input, marginBottom: 12 }} value={usarPersonaId} onChange={(e) => loadPosts(e.target.value)}>
              <option value="">Selecione persona</option>
              {personas.map((p) => <option key={p.id} value={p.id}>@{p.slug}</option>)}
            </select>
            <select style={{ ...input, marginBottom: 16 }} value={usarPostId} onChange={(e) => setUsarPostId(e.target.value)} disabled={!usarPersonaId}>
              <option value="">Post pendente</option>
              {postsOpts.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setUsarPost(null)} style={{ padding: "8px 14px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button onClick={aplicarEmPost} disabled={!usarPostId || saving} style={{ padding: "8px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div onClick={() => !saving && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 640, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{editing ? "Editar prompt" : "Novo prompt"}</h2>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "#7d899c", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Título *</label><input style={input} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required /></div>
              <div><label style={label}>Categoria</label>
                <select style={input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                  {Object.entries(CATEGORIA_PROMPT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label style={label}>Ferramenta</label><input style={input} value={form.ferramenta ?? ""} onChange={(e) => set("ferramenta", e.target.value)} placeholder="magnific..." /></div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Prompt *</label>
              <textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={form.prompt} onChange={(e) => set("prompt", e.target.value)} required />
              {blWarn.length > 0 && (
                <p style={{ color: "#f59e0b", fontSize: 12, marginTop: 4 }}>⚠ RN-02: contém termos de aparência ({blWarn.join(", ")}). Prompts globais não devem descrever o físico da persona.</p>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Prompt negativo</label>
              <textarea style={{ ...input, minHeight: 48, resize: "vertical" }} value={form.negativoPrompt ?? ""} onChange={(e) => set("negativoPrompt", e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Estilo base</label><input style={input} value={form.estiloBase ?? ""} onChange={(e) => set("estiloBase", e.target.value)} /></div>
              <div><label style={label}>Avaliação (0-5)</label><input style={input} type="number" step="0.1" min="0" max="5" value={form.avaliacaoMedia ?? ""} onChange={(e) => set("avaliacaoMedia", e.target.value === "" ? null : Number(e.target.value))} /></div>
              <div><label style={label}>Tags (vírgula)</label><input style={input} value={tagsText} onChange={(e) => setTagsText(e.target.value)} /></div>
            </div>

            {/* Galeria de exemplos */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={label}>Exemplos (URL da imagem + persona)</label>
                <button type="button" onClick={() => setExemplos((e) => [...e, { url: "", personaUsada: "" }])} style={{ background: "transparent", color: "#7c3aed", border: "1px solid #2d2d3f", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>+ Exemplo</button>
              </div>
              {exemplos.map((ex, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 6 }}>
                  <input style={input} value={ex.url} onChange={(e) => setExemplos((xs) => xs.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))} placeholder="https://.../img.png" />
                  <input style={input} value={ex.personaUsada ?? ""} onChange={(e) => setExemplos((xs) => xs.map((x, idx) => idx === i ? { ...x, personaUsada: e.target.value } : x))} placeholder="slug persona" />
                  <button type="button" onClick={() => setExemplos((xs) => xs.filter((_, idx) => idx !== i))} style={{ background: "transparent", color: "#7d899c", border: "1px solid #2d2d3f", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Parâmetros (JSON opcional)</label>
              <textarea style={{ ...input, minHeight: 44, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={paramsText} onChange={(e) => setParamsText(e.target.value)} placeholder='{"steps": 30}' />
            </div>

            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>{editing && <button type="button" onClick={remove} disabled={saving} style={{ padding: "10px 16px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Excluir</button>}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: "10px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
