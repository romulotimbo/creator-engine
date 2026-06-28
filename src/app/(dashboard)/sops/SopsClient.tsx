"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CATEGORIA_SOP_LABELS, STATUS_SOP_LABELS, STATUS_SOP_COLORS, formatDate,
} from "@/lib/utils"

type Passo = { id?: string; titulo: string; descricao: string | null; ferramenta: string | null }
type Hist = { versao: string; mudanca: string; data: string }
type Sop = {
  id: string; titulo: string; categoria: string; versao: string; status: string
  descricao: string | null; execucoes: number; passos: Passo[]; historico: Hist[]
}
type Persona = { slug: string }

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }

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
      const res = await fetch(editing ? `/api/sops/${form.id}` : "/api/sops", {
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
      const res = await fetch(`/api/sops/${form.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <select style={{ ...input, width: "auto" }} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIA_SOP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={openNew} style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Novo SOP</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 48, textAlign: "center", color: "var(--faint)" }}>Nenhum SOP ainda.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filtered.map((s) => {
            const sc = STATUS_SOP_COLORS[s.status]
            return (
              <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "var(--faint)", fontSize: 11 }}>{CATEGORIA_SOP_LABELS[s.categoria]}</span>
                  <span style={{ padding: "2px 8px", background: sc + "20", color: sc, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{STATUS_SOP_LABELS[s.status]} · v{s.versao}</span>
                </div>
                <p style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{s.titulo}</p>
                <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 12 }}>{s.passos.length} passo(s) · {s.execucoes} execução(ões)</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setExec(s)} disabled={s.passos.length === 0} style={{ flex: 1, minWidth: 80, padding: "7px 0", background: s.passos.length ? "var(--accent)" : "var(--border-strong)", color: "var(--accent-foreground)", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: s.passos.length ? "pointer" : "default" }}>Executar</button>
                  <button onClick={() => openEdit(s)} style={{ padding: "7px 12px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>Editar</button>
                  <a href={`/api/sops/${s.id}/export?format=md`} style={{ padding: "7px 10px", color: "var(--accent)", border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)", borderRadius: 7, fontSize: 12, textDecoration: "none" }}>MD</a>
                  <a href={`/api/sops/${s.id}/export?format=pdf`} style={{ padding: "7px 10px", color: "var(--accent)", border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)", borderRadius: 7, fontSize: 12, textDecoration: "none" }}>PDF</a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD modal */}
      {open && (
        <div onClick={() => !saving && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 680, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>{editing ? "Editar SOP" : "Novo SOP"}</h2>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Título *</label><input style={input} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required /></div>
              <div><label style={label}>Categoria</label>
                <select style={input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                  {Object.entries(CATEGORIA_SOP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label style={label}>Versão</label><input style={input} value={form.versao} onChange={(e) => set("versao", e.target.value)} placeholder="1.0.0" /></div>
              <div><label style={label}>Status</label>
                <select style={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {Object.entries(STATUS_SOP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Descrição</label>
              <textarea style={{ ...input, minHeight: 48, resize: "vertical" }} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={label}>Passos</label>
                <button type="button" onClick={() => set("passos", [...form.passos, { titulo: "", descricao: "", ferramenta: "" }])} style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>+ Passo</button>
              </div>
              {form.passos.map((p, i) => (
                <div key={i} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "var(--faint)", fontSize: 12, width: 18 }}>{i + 1}.</span>
                    <input style={input} value={p.titulo} onChange={(e) => updPasso(i, { titulo: e.target.value })} placeholder="Título do passo" />
                    <button type="button" onClick={() => movePasso(i, -1)} style={{ background: "transparent", color: "var(--faint)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "0 8px", cursor: "pointer" }}>↑</button>
                    <button type="button" onClick={() => movePasso(i, 1)} style={{ background: "transparent", color: "var(--faint)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "0 8px", cursor: "pointer" }}>↓</button>
                    <button type="button" onClick={() => set("passos", form.passos.filter((_, idx) => idx !== i))} style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "0 8px", cursor: "pointer" }}>✕</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                    <input style={{ ...input, padding: "6px 9px" }} value={p.descricao ?? ""} onChange={(e) => updPasso(i, { descricao: e.target.value })} placeholder="descrição (opcional)" />
                    <input style={{ ...input, padding: "6px 9px" }} value={p.ferramenta ?? ""} onChange={(e) => updPasso(i, { ferramenta: e.target.value })} placeholder="ferramenta (opcional)" />
                  </div>
                </div>
              ))}
            </div>

            {editing && (
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Nota de changelog (registra na versão {form.versao})</label>
                <input style={input} value={mudanca} onChange={(e) => setMudanca(e.target.value)} placeholder="o que mudou nesta versão" />
                {form.historico.length > 0 && (
                  <div style={{ marginTop: 8, maxHeight: 90, overflowY: "auto" }}>
                    {form.historico.map((h, i) => (
                      <p key={i} style={{ color: "var(--faint)", fontSize: 11, marginBottom: 3 }}>v{h.versao} · {formatDate(h.data)} — {h.mudanca}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <div style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", color: "var(--danger)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>{editing && <button type="button" onClick={remove} disabled={saving} style={{ padding: "10px 16px", background: "transparent", color: "var(--danger)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Excluir</button>}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: "10px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </form>
        </div>
      )}

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
      const res = await fetch(`/api/sops/${sop.id}/executar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaUsada: slug || null, passosConcluidos: sop.passos.filter((p) => done[p.id!]).map((p) => p.id), concluida }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha.") }
      onDone()
    } catch (err: any) { setError(err.message); setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 60, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>Executar: {sop.titulo}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <select style={{ ...input, width: "auto" }} value={slug} onChange={(e) => setSlug(e.target.value)}>
            <option value="">sem persona</option>
            {personas.map((p) => <option key={p.slug} value={p.slug}>@{p.slug}</option>)}
          </select>
          <div style={{ flex: 1 }}>
            <div style={{ background: "var(--border-strong)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ background: pct === 100 ? "var(--success)" : "var(--accent)", height: "100%", width: `${pct}%` }} />
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

        {error && <div style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", color: "var(--danger)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => salvar(false)} disabled={saving} style={{ padding: "10px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Salvar progresso</button>
          <button onClick={() => salvar(true)} disabled={saving || concluidos < total} style={{ padding: "10px 20px", background: concluidos < total ? "var(--border-strong)" : "var(--success)", color: concluidos < total ? "var(--faint)" : "var(--background)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: concluidos < total ? "default" : "pointer" }}>Concluir execução</button>
        </div>
      </div>
    </div>
  )
}
