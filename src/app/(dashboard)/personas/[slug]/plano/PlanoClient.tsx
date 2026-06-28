"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

type Kpi = { metrica: string; valorInicio: string | null; valorMeta: string | null; valorFinal: string | null }
type Plano = { id: string; semana: string; objetivo: string | null; observacoes: string | null; kpis: Kpi[] }

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }
const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }

function progress(k: Kpi): number | null {
  const ini = Number(k.valorInicio), meta = Number(k.valorMeta), fin = Number(k.valorFinal)
  if (k.valorMeta == null || k.valorFinal == null || isNaN(meta) || isNaN(fin)) return null
  const base = !isNaN(ini) ? ini : 0
  if (meta === base) return fin >= meta ? 100 : 0
  return Math.max(0, Math.min(100, Math.round(((fin - base) / (meta - base)) * 100)))
}

function emptyKpi(): Kpi { return { metrica: "", valorInicio: "", valorMeta: "", valorFinal: "" } }

export default function PlanoClient({
  personaId, currentWeek, initialPlanos,
}: {
  personaId: string; currentWeek: string; initialPlanos: Plano[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [semana, setSemana] = useState(currentWeek)
  const [objetivo, setObjetivo] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [kpis, setKpis] = useState<Kpi[]>([emptyKpi()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNew() {
    setEditId(null); setSemana(currentWeek); setObjetivo(""); setObservacoes(""); setKpis([emptyKpi()]); setError(null); setOpen(true)
  }
  function openEdit(p: Plano) {
    setEditId(p.id); setSemana(p.semana); setObjetivo(p.objetivo || ""); setObservacoes(p.observacoes || "")
    setKpis(p.kpis.length ? p.kpis.map((k) => ({ ...k })) : [emptyKpi()]); setError(null); setOpen(true)
  }
  function updKpi(i: number, patch: Partial<Kpi>) { setKpis((ks) => ks.map((k, idx) => (idx === i ? { ...k, ...patch } : k))) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanKpis = kpis.filter((k) => k.metrica.trim())
    setSaving(true)
    try {
      let res: Response
      if (editId) {
        res = await fetch(`/api/planos/${editId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objetivo, observacoes, kpis: cleanKpis }),
        })
      } else {
        res = await fetch(`/api/planos`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personaId, semana, objetivo, observacoes, kpis: cleanKpis }),
        })
      }
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.")
      }
      setOpen(false); router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!editId || !confirm("Excluir esta semana e seus KPIs?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/planos/${editId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={openNew} style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Nova semana</button>
      </div>

      {initialPlanos.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "var(--faint)", padding: 48 }}>Nenhum plano semanal ainda. Crie a primeira sprint.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
          {initialPlanos.map((p) => (
            <div key={p.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{p.semana}</span>
                <button onClick={() => openEdit(p)} style={{ background: "transparent", border: "1px solid var(--border-strong)", color: "var(--muted-foreground)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>editar</button>
              </div>
              {p.objetivo && <p style={{ color: "var(--foreground)", fontSize: 14, marginBottom: 12 }}>{p.objetivo}</p>}
              {p.kpis.length === 0 ? (
                <p style={{ color: "var(--faint)", fontSize: 12 }}>Sem KPIs.</p>
              ) : (
                p.kpis.map((k, i) => {
                  const pct = progress(k)
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>{k.metrica}</span>
                        <span style={{ color: "var(--faint)" }}>
                          {k.valorFinal || k.valorInicio || "—"}{k.valorMeta ? ` / ${k.valorMeta}` : ""}
                        </span>
                      </div>
                      {pct !== null && (
                        <div style={{ background: "var(--border-strong)", borderRadius: 4, height: 5, overflow: "hidden" }}>
                          <div style={{ background: pct >= 100 ? "var(--success)" : "var(--accent)", height: "100%", width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              {p.observacoes && <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 10 }}>{p.observacoes}</p>}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div onClick={() => !saving && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "50px 20px", zIndex: 50, overflowY: "auto" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 640, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>{editId ? "Editar semana" : "Nova semana"}</h2>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label}>Semana (ISO)</label>
                <input style={{ ...input, opacity: editId ? 0.5 : 1 }} value={semana} disabled={!!editId} onChange={(e) => setSemana(e.target.value)} placeholder="2026-W25" />
              </div>
              <div>
                <label style={label}>Objetivo da sprint</label>
                <input style={input} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={label}>KPIs</label>
                <button type="button" onClick={() => setKpis((k) => [...k, emptyKpi()])} style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>+ KPI</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 4 }}>
                {["Métrica", "Início", "Meta", "Atual", ""].map((h, i) => <span key={i} style={{ color: "var(--faint)", fontSize: 11 }}>{h}</span>)}
              </div>
              {kpis.map((k, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 6 }}>
                  <input style={input} value={k.metrica} onChange={(e) => updKpi(i, { metrica: e.target.value })} placeholder="seguidores IG" />
                  <input style={input} value={k.valorInicio || ""} onChange={(e) => updKpi(i, { valorInicio: e.target.value })} />
                  <input style={input} value={k.valorMeta || ""} onChange={(e) => updKpi(i, { valorMeta: e.target.value })} />
                  <input style={input} value={k.valorFinal || ""} onChange={(e) => updKpi(i, { valorFinal: e.target.value })} />
                  <button type="button" onClick={() => setKpis((ks) => ks.filter((_, idx) => idx !== i))} style={{ background: "transparent", color: "var(--faint)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Observações</label>
              <textarea style={{ ...input, minHeight: 50, resize: "vertical" }} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>

            {error && <div style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", color: "var(--danger)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>{editId && <button type="button" onClick={remove} disabled={saving} style={{ padding: "10px 16px", background: "transparent", color: "var(--danger)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Excluir</button>}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: "10px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
