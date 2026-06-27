"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CATEGORIA_TEMPLATE_LABELS, PLATAFORMA_LABELS, PILAR_LABELS,
  extractTemplateVars, renderTemplate,
} from "@/lib/utils"

type Variavel = { nome: string; descricao: string | null; valorPadrao: string | null }
type Template = {
  id: string; titulo: string; categoria: string; nicho: string | null
  plataforma: string | null; pilar: string | null; conteudo: string
  tags: string[]; usos: number; exemplos: number; variaveis: Variavel[]
}
type Persona = { slug: string; nomeArtistico: string; nicho: string }

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "#0a0a0f", border: "1px solid #2d2d3f",
  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 5 }

function emptyForm(): Template {
  return { id: "", titulo: "", categoria: "ROTEIRO", nicho: "", plataforma: "", pilar: "", conteudo: "", tags: [], usos: 0, exemplos: 0, variaveis: [] }
}

export default function TemplatesClient({ initial, personas }: { initial: Template[]; personas: Persona[] }) {
  const router = useRouter()
  const [fCategoria, setFCategoria] = useState("")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Template>(emptyForm())
  const [tagsText, setTagsText] = useState("")
  const [varMeta, setVarMeta] = useState<Record<string, { descricao: string; valorPadrao: string }>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editing = !!form.id

  // instanciação
  const [usar, setUsar] = useState<Template | null>(null)

  const filtered = initial.filter((t) => !fCategoria || t.categoria === fCategoria)
  const detectedVars = useMemo(() => extractTemplateVars(form.conteudo), [form.conteudo])

  function openNew() { setForm(emptyForm()); setTagsText(""); setVarMeta({}); setError(null); setOpen(true) }
  function openEdit(t: Template) {
    setForm({ ...t, nicho: t.nicho || "", plataforma: t.plataforma || "", pilar: t.pilar || "" })
    setTagsText(t.tags.join(", "))
    setVarMeta(Object.fromEntries(t.variaveis.map((v) => [v.nome, { descricao: v.descricao || "", valorPadrao: v.valorPadrao || "" }])))
    setError(null); setOpen(true)
  }
  function set<K extends keyof Template>(k: K, v: Template[K]) { setForm((s) => ({ ...s, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      const variaveis = detectedVars.map((nome) => ({
        nome, descricao: varMeta[nome]?.descricao || null, valorPadrao: varMeta[nome]?.valorPadrao || null,
      }))
      const payload: any = {
        titulo: form.titulo, categoria: form.categoria, nicho: form.nicho || null,
        plataforma: form.plataforma || null, pilar: form.pilar || null, conteudo: form.conteudo,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean), variaveis,
      }
      const res = await fetch(editing ? `/api/templates/${form.id}` : "/api/templates", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.") }
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove() {
    if (!editing || !confirm("Excluir este template?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/templates/${form.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <select style={{ ...input, width: "auto" }} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIA_TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={openNew} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Novo template</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 48, textAlign: "center", color: "#7d899c" }}>Nenhum template ainda.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((t) => (
            <div key={t.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ padding: "2px 8px", background: "#7c3aed20", color: "#a78bfa", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{CATEGORIA_TEMPLATE_LABELS[t.categoria]}</span>
                <span style={{ color: "#7d899c", fontSize: 11 }}>{t.usos} uso(s)</span>
              </div>
              <p style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t.titulo}</p>
              <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, maxHeight: 54, overflow: "hidden", whiteSpace: "pre-wrap" }}>{t.conteudo}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {[t.plataforma && PLATAFORMA_LABELS[t.plataforma], t.pilar && PILAR_LABELS[t.pilar]?.split(" ")[0], t.nicho].filter(Boolean).map((x, i) => (
                  <span key={i} style={{ color: "#7d899c", fontSize: 11, background: "#1e1e2e", padding: "2px 7px", borderRadius: 4 }}>{x}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => setUsar(t)} style={{ flex: 1, padding: "7px 0", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Usar template</button>
                <button onClick={() => openEdit(t)} style={{ padding: "7px 12px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      {open && (
        <div onClick={() => !saving && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 640, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{editing ? "Editar template" : "Novo template"}</h2>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "#7d899c", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Título *</label><input style={input} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required /></div>
              <div><label style={label}>Categoria</label>
                <select style={input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                  {Object.entries(CATEGORIA_TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Nicho</label><input style={input} value={form.nicho ?? ""} onChange={(e) => set("nicho", e.target.value)} /></div>
              <div><label style={label}>Plataforma</label>
                <select style={input} value={form.plataforma ?? ""} onChange={(e) => set("plataforma", e.target.value)}>
                  <option value="">—</option>
                  {Object.entries(PLATAFORMA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label style={label}>Pilar</label>
                <select style={input} value={form.pilar ?? ""} onChange={(e) => set("pilar", e.target.value)}>
                  <option value="">—</option>
                  {Object.entries(PILAR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Conteúdo (use variáveis no formato {"{{nome_persona}}"}, {"{{nicho}}"}, {"{{cta}}"})</label>
              <textarea style={{ ...input, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 13 }} value={form.conteudo} onChange={(e) => set("conteudo", e.target.value)} required />
            </div>

            {detectedVars.length > 0 && (
              <div style={{ marginBottom: 12, background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 8, padding: 12 }}>
                <p style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Variáveis detectadas ({detectedVars.length})</p>
                {detectedVars.map((nome) => (
                  <div key={nome} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 8, marginBottom: 6, alignItems: "center" }}>
                    <code style={{ color: "#e2e8f0", fontSize: 12 }}>{`{{${nome}}}`}</code>
                    <input style={{ ...input, padding: "6px 9px" }} placeholder="descrição" value={varMeta[nome]?.descricao || ""} onChange={(e) => setVarMeta((m) => ({ ...m, [nome]: { ...m[nome], descricao: e.target.value, valorPadrao: m[nome]?.valorPadrao || "" } }))} />
                    <input style={{ ...input, padding: "6px 9px" }} placeholder="valor padrão" value={varMeta[nome]?.valorPadrao || ""} onChange={(e) => setVarMeta((m) => ({ ...m, [nome]: { ...m[nome], valorPadrao: e.target.value, descricao: m[nome]?.descricao || "" } }))} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 12 }}><label style={label}>Tags (vírgula)</label><input style={input} value={tagsText} onChange={(e) => setTagsText(e.target.value)} /></div>

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

      {usar && <UsarModal template={usar} personas={personas} onClose={() => setUsar(null)} onDone={() => { setUsar(null); router.refresh() }} />}
    </>
  )
}

function UsarModal({ template, personas, onClose, onDone }: { template: Template; personas: Persona[]; onClose: () => void; onDone: () => void }) {
  const vars = extractTemplateVars(template.conteudo)
  const [slug, setSlug] = useState(personas[0]?.slug ?? "")
  const persona = personas.find((p) => p.slug === slug)
  const padrao = Object.fromEntries(template.variaveis.map((v) => [v.nome, v.valorPadrao || ""]))
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // valores efetivos: edição manual > derivado da persona > valor padrão
  const effective: Record<string, string> = {}
  for (const v of vars) {
    if (values[v] !== undefined) effective[v] = values[v]
    else if (v === "nome_persona" && persona) effective[v] = persona.nomeArtistico
    else if (v === "nicho" && persona) effective[v] = persona.nicho
    else effective[v] = padrao[v] || ""
  }
  const preview = renderTemplate(template.conteudo, effective)

  async function registrar() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/templates/${template.id}/usar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaUsada: slug || null, conteudoFinal: preview }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha.") }
      onDone()
    } catch (err: any) { setError(err.message); setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 60, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 600, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Usar: {template.titulo}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#7d899c", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>Persona</label>
          <select style={input} value={slug} onChange={(e) => setSlug(e.target.value)}>
            {personas.map((p) => <option key={p.slug} value={p.slug}>@{p.slug}</option>)}
          </select>
        </div>

        {vars.map((v) => (
          <div key={v} style={{ marginBottom: 10 }}>
            <label style={label}><code>{`{{${v}}}`}</code></label>
            <input style={input} value={effective[v]} onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))} />
          </div>
        ))}

        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <label style={label}>Pré-visualização</label>
          <div style={{ background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 8, padding: 12, color: "#e2e8f0", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{preview}</div>
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Fechar</button>
          <button onClick={registrar} disabled={saving} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Registrando..." : "Registrar uso"}</button>
        </div>
      </div>
    </div>
  )
}
