"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CATEGORIA_TEMPLATE_LABELS, PLATAFORMA_LABELS, PILAR_LABELS,
  extractTemplateVars, renderTemplate,
} from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type Variavel = { nome: string; descricao: string | null; valorPadrao: string | null }
type Template = {
  id: string; titulo: string; categoria: string; nicho: string | null
  plataforma: string | null; pilar: string | null; conteudo: string
  tags: string[]; usos: number; exemplos: number; variaveis: Variavel[]
}
type Persona = { slug: string; nomeArtistico: string; nicho: string }

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
      const res = await fetch(editing ? apiUrl(`/api/templates/${form.id}`) : apiUrl("/api/templates"), {
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
      const res = await fetch(apiUrl(`/api/templates/${form.id}`), { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <Select style={{ width: "auto" }} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIA_TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <div style={{ flex: 1 }} />
        <Button type="button" onClick={openNew}>+ Novo template</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>Nenhum template ainda.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((t) => (
            <Surface key={t.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ padding: "2px 8px", background: "color-mix(in oklch, var(--accent) 12%, transparent)", color: "var(--accent)", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{CATEGORIA_TEMPLATE_LABELS[t.categoria]}</span>
                <span style={{ color: "var(--faint)", fontSize: 11 }}>{t.usos} uso(s)</span>
              </div>
              <p style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t.titulo}</p>
              <p style={{ color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.5, maxHeight: 54, overflow: "hidden", whiteSpace: "pre-wrap" }}>{t.conteudo}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {[t.plataforma && PLATAFORMA_LABELS[t.plataforma], t.pilar && PILAR_LABELS[t.pilar]?.split(" ")[0], t.nicho].filter(Boolean).map((x, i) => (
                  <span key={i} style={{ color: "var(--faint)", fontSize: 11, background: "var(--border)", padding: "2px 7px", borderRadius: 4 }}>{x}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button type="button" fullWidth onClick={() => setUsar(t)}>Usar template</Button>
                <Button type="button" variant="ghost" onClick={() => openEdit(t)}>Editar</Button>
              </div>
            </Surface>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => !saving && setOpen(false)} maxWidth="40rem">
        <form onSubmit={save}>
          <ModalHeader title={editing ? "Editar template" : "Novo template"} onClose={() => !saving && setOpen(false)} />

          <div className="ce-form-grid" data-cols="2">
            <Field label="Título *">
              <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
            </Field>
            <Field label="Categoria">
              <Select value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                {Object.entries(CATEGORIA_TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>

          <div className="ce-form-grid" data-cols="3">
            <Field label="Nicho">
              <Input value={form.nicho ?? ""} onChange={(e) => set("nicho", e.target.value)} />
            </Field>
            <Field label="Plataforma">
              <Select value={form.plataforma ?? ""} onChange={(e) => set("plataforma", e.target.value)}>
                <option value="">—</option>
                {Object.entries(PLATAFORMA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Pilar">
              <Select value={form.pilar ?? ""} onChange={(e) => set("pilar", e.target.value)}>
                <option value="">—</option>
                {Object.entries(PILAR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>

          <Field label={'Conteúdo (use variáveis no formato {{nome_persona}}, {{nicho}}, {{cta}})'}>
            <Textarea style={{ minHeight: 120, fontFamily: "monospace", fontSize: 13 }} value={form.conteudo} onChange={(e) => set("conteudo", e.target.value)} required />
          </Field>

          {detectedVars.length > 0 && (
            <Surface style={{ marginBottom: "var(--space-md)", padding: 12, background: "var(--background)" }}>
              <p style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Variáveis detectadas ({detectedVars.length})</p>
              {detectedVars.map((nome) => (
                <div key={nome} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <code style={{ color: "var(--foreground)", fontSize: 12 }}>{`{{${nome}}}`}</code>
                  <Input style={{ padding: "6px 9px" }} placeholder="descrição" value={varMeta[nome]?.descricao || ""} onChange={(e) => setVarMeta((m) => ({ ...m, [nome]: { ...m[nome], descricao: e.target.value, valorPadrao: m[nome]?.valorPadrao || "" } }))} />
                  <Input style={{ padding: "6px 9px" }} placeholder="valor padrão" value={varMeta[nome]?.valorPadrao || ""} onChange={(e) => setVarMeta((m) => ({ ...m, [nome]: { ...m[nome], valorPadrao: e.target.value, descricao: m[nome]?.descricao || "" } }))} />
                </div>
              ))}
            </Surface>
          )}

          <Field label="Tags (vírgula)">
            <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
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
      const res = await fetch(apiUrl(`/api/templates/${template.id}/usar`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaUsada: slug || null, conteudoFinal: preview }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha.") }
      onDone()
    } catch (err: any) { setError(err.message); setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} maxWidth="37.5rem">
      <ModalHeader title={`Usar: ${template.titulo}`} onClose={onClose} />

      <Field label="Persona">
        <Select value={slug} onChange={(e) => setSlug(e.target.value)}>
          {personas.map((p) => <option key={p.slug} value={p.slug}>@{p.slug}</option>)}
        </Select>
      </Field>

      {vars.map((v) => (
        <Field key={v} label={`{{${v}}}`}>
          <Input value={effective[v]} onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))} />
        </Field>
      ))}

      <Field label="Pré-visualização">
        <Surface style={{ padding: 12, background: "var(--background)", color: "var(--foreground)", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {preview}
        </Surface>
      </Field>

      {error && <FormError>{error}</FormError>}

      <FormActions>
        <div />
        <div className="ce-form-actions-end">
          <Button type="button" variant="ghost" onClick={onClose}>Fechar</Button>
          <Button type="button" onClick={registrar} disabled={saving}>{saving ? "Registrando..." : "Registrar uso"}</Button>
        </div>
      </FormActions>
    </Modal>
  )
}
