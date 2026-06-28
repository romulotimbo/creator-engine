"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CATEGORIA_SOP_LABELS, STATUS_SOP_LABELS, STATUS_SOP_COLORS, formatDate,
} from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type Passo = { id?: string; titulo: string; descricao: string | null; ferramenta: string | null }
type Hist = { versao: string; mudanca: string; data: string }
type Sop = {
  id: string; titulo: string; categoria: string; versao: string; status: string
  descricao: string | null; execucoes: number; passos: Passo[]; historico: Hist[]
}
type Persona = { slug: string }

function emptyForm(): Sop {
  return { id: "", titulo: "", categoria: "ONBOARDING", versao: "1.0.0", status: "RASCUNHO", descricao: "", execucoes: 0, passos: [{ titulo: "", descricao: "", ferramenta: "" }], historico: [] }
}

export default function SopsClient({ initial, personas }: { initial: Sop[]; personas: Persona[] }) {
  const router = useRouter()
  const [fCategoria, setFCategoria] = useState("")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Sop>(emptyForm())
  const [mudanca, setMudanca] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exec, setExec] = useState<Sop | null>(null)
  const editing = !!form.id

  const filtered = initial.filter((s) => !fCategoria || s.categoria === fCategoria)

  function openNew() { setForm(emptyForm()); setMudanca(""); setError(null); setOpen(true) }
  function openEdit(s: Sop) {
    setForm({ ...s, descricao: s.descricao || "", passos: s.passos.length ? s.passos.map((p) => ({ ...p })) : [{ titulo: "", descricao: "", ferramenta: "" }] })
    setMudanca(""); setError(null); setOpen(true)
  }
  function set<K extends keyof Sop>(k: K, v: Sop[K]) { setForm((s) => ({ ...s, [k]: v })) }
  function updPasso(i: number, patch: Partial<Passo>) { setForm((s) => ({ ...s, passos: s.passos.map((p, idx) => idx === i ? { ...p, ...patch } : p) })) }
  function movePasso(i: number, dir: -1 | 1) {
    setForm((s) => {
      const arr = [...s.passos]; const j = i + dir
      if (j < 0 || j >= arr.length) return s
      ;[arr[i], arr[j]] = [arr[j], arr[i]]; return { ...s, passos: arr }
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      const passos = form.passos.filter((p) => p.titulo.trim()).map((p) => ({ titulo: p.titulo, descricao: p.descricao || null, ferramenta: p.ferramenta || null }))
      const payload: any = { titulo: form.titulo, categoria: form.categoria, versao: form.versao, status: form.status, descricao: form.descricao || null, passos }
      if (editing && mudanca.trim()) payload.mudanca = mudanca
      const res = await fetch(editing ? apiUrl(`/api/sops/${form.id}`) : apiUrl("/api/sops"), {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.") }
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove() {
    if (!editing || !confirm("Excluir este SOP?")) return
    setSaving(true)
    try {
      const res = await fetch(apiUrl(`/api/sops/${form.id}`), { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <Select style={{ width: "auto" }} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIA_SOP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <div style={{ flex: 1 }} />
        <Button onClick={openNew}>+ Novo SOP</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>Nenhum SOP ainda.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filtered.map((s) => {
            const sc = STATUS_SOP_COLORS[s.status]
            return (
              <Surface key={s.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "var(--faint)", fontSize: 11 }}>{CATEGORIA_SOP_LABELS[s.categoria]}</span>
                  <span style={{ padding: "2px 8px", background: sc + "20", color: sc, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{STATUS_SOP_LABELS[s.status]} · v{s.versao}</span>
                </div>
                <p style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{s.titulo}</p>
                <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 12 }}>{s.passos.length} passo(s) · {s.execucoes} execução(ões)</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button onClick={() => setExec(s)} disabled={s.passos.length === 0} fullWidth style={{ flex: 1, minWidth: 80 }}>Executar</Button>
                  <Button variant="ghost" onClick={() => openEdit(s)}>Editar</Button>
                  <a href={`/api/sops/${s.id}/export?format=md`} style={{ padding: "7px 10px", color: "var(--accent)", border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)", borderRadius: 7, fontSize: 12, textDecoration: "none" }}>MD</a>
                  <a href={`/api/sops/${s.id}/export?format=pdf`} style={{ padding: "7px 10px", color: "var(--accent)", border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)", borderRadius: 7, fontSize: 12, textDecoration: "none" }}>PDF</a>
                </div>
              </Surface>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => !saving && setOpen(false)} maxWidth="680px">
        <form onSubmit={save}>
          <ModalHeader title={editing ? "Editar SOP" : "Novo SOP"} onClose={() => setOpen(false)} />

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Título *">
              <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
            </Field>
            <Field label="Categoria">
              <Select value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                {Object.entries(CATEGORIA_SOP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Versão">
              <Input value={form.versao} onChange={(e) => set("versao", e.target.value)} placeholder="1.0.0" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {Object.entries(STATUS_SOP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Descrição">
            <Textarea style={{ minHeight: 48, resize: "vertical" }} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
          </Field>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="ce-label">Passos</span>
              <Button type="button" variant="ghost" onClick={() => set("passos", [...form.passos, { titulo: "", descricao: "", ferramenta: "" }])}>+ Passo</Button>
            </div>
            {form.passos.map((p, i) => (
              <Surface key={i} style={{ padding: 10, marginBottom: 8, background: "var(--background)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "var(--faint)", fontSize: 12, width: 18 }}>{i + 1}.</span>
                  <Input value={p.titulo} onChange={(e) => updPasso(i, { titulo: e.target.value })} placeholder="Título do passo" />
                  <Button type="button" variant="ghost" onClick={() => movePasso(i, -1)}>↑</Button>
                  <Button type="button" variant="ghost" onClick={() => movePasso(i, 1)}>↓</Button>
                  <Button type="button" variant="danger" onClick={() => set("passos", form.passos.filter((_, idx) => idx !== i))}>✕</Button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                  <Input value={p.descricao ?? ""} onChange={(e) => updPasso(i, { descricao: e.target.value })} placeholder="descrição (opcional)" />
                  <Input value={p.ferramenta ?? ""} onChange={(e) => updPasso(i, { ferramenta: e.target.value })} placeholder="ferramenta (opcional)" />
                </div>
              </Surface>
            ))}
          </div>

          {editing && (
            <Field label={`Nota de changelog (registra na versão ${form.versao})`}>
              <Input value={mudanca} onChange={(e) => setMudanca(e.target.value)} placeholder="o que mudou nesta versão" />
              {form.historico.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: 90, overflowY: "auto" }}>
                  {form.historico.map((h, i) => (
                    <p key={i} style={{ color: "var(--faint)", fontSize: 11, marginBottom: 3 }}>v{h.versao} · {formatDate(h.data)} — {h.mudanca}</p>
                  ))}
                </div>
              )}
            </Field>
          )}

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div>{editing && <Button type="button" variant="danger" onClick={remove} disabled={saving}>Excluir</Button>}</div>
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </FormActions>
        </form>
      </Modal>

      {exec && <ExecModal sop={exec} personas={personas} onClose={() => setExec(null)} onDone={() => { setExec(null); router.refresh() }} />}
    </>
  )
}

function ExecModal({ sop, personas, onClose, onDone }: { sop: Sop; personas: Persona[]; onClose: () => void; onDone: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [slug, setSlug] = useState(personas[0]?.slug ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = sop.passos.length
  const concluidos = sop.passos.filter((p) => done[p.id!]).length
  const pct = total ? Math.round((concluidos / total) * 100) : 0

  async function salvar(concluida: boolean) {
    setSaving(true); setError(null)
    try {
      const res = await fetch(apiUrl(`/api/sops/${sop.id}/executar`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaUsada: slug || null, passosConcluidos: sop.passos.filter((p) => done[p.id!]).map((p) => p.id), concluida }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha.") }
      onDone()
    } catch (err: any) { setError(err.message); setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} maxWidth="620px">
      <ModalHeader title={`Executar: ${sop.titulo}`} onClose={onClose} />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Select style={{ width: "auto" }} value={slug} onChange={(e) => setSlug(e.target.value)}>
          <option value="">sem persona</option>
          {personas.map((p) => <option key={p.slug} value={p.slug}>@{p.slug}</option>)}
        </Select>
        <div style={{ flex: 1 }}>
          <div className="ce-progress-track">
            <div className="ce-progress-fill" style={{ width: `${pct}%` }} data-complete={pct === 100 ? "true" : undefined} />
          </div>
        </div>
        <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{concluidos}/{total}</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        {sop.passos.map((p, i) => (
          <label key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: done[p.id!] ? "color-mix(in oklch, var(--success) 12%, var(--background))" : "var(--background)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={!!done[p.id!]} onChange={(e) => setDone((d) => ({ ...d, [p.id!]: e.target.checked }))} style={{ marginTop: 3 }} />
            <div>
              <p style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 600, textDecoration: done[p.id!] ? "line-through" : "none" }}>{i + 1}. {p.titulo}</p>
              {p.descricao && <p style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 2 }}>{p.descricao}</p>}
              {p.ferramenta && <span style={{ color: "var(--accent)", fontSize: 11 }}>⚙ {p.ferramenta}</span>}
            </div>
          </label>
        ))}
      </div>

      {error && <FormError>{error}</FormError>}

      <FormActions>
        <div />
        <div className="ce-form-actions-end">
          <Button variant="ghost" onClick={() => salvar(false)} disabled={saving}>Salvar progresso</Button>
          <Button onClick={() => salvar(true)} disabled={saving || concluidos < total}>Concluir execução</Button>
        </div>
      </FormActions>
    </Modal>
  )
}
