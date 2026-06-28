"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Textarea, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type Kpi = { metrica: string; valorInicio: string | null; valorMeta: string | null; valorFinal: string | null }
type Plano = { id: string; semana: string; objetivo: string | null; observacoes: string | null; kpis: Kpi[] }

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
        res = await fetch(apiUrl(`/api/planos/${editId}`), {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objetivo, observacoes, kpis: cleanKpis }),
        })
      } else {
        res = await fetch(apiUrl(`/api/planos`), {
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
      const res = await fetch(apiUrl(`/api/planos/${editId}`), { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button onClick={openNew}>+ Nova semana</Button>
      </div>

      {initialPlanos.length === 0 ? (
        <EmptyState>Nenhum plano semanal ainda. Crie a primeira sprint.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
          {initialPlanos.map((p) => (
            <Surface key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{p.semana}</span>
                <Button variant="ghost" onClick={() => openEdit(p)} style={{ padding: "4px 10px", fontSize: 12 }}>editar</Button>
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
                        <div className="ce-progress-track">
                          <div className="ce-progress-fill" style={{ width: `${pct}%` }} data-complete={pct >= 100 ? "true" : undefined} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              {p.observacoes && <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 10 }}>{p.observacoes}</p>}
            </Surface>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => !saving && setOpen(false)} maxWidth="640px">
        <form onSubmit={save}>
          <ModalHeader title={editId ? "Editar semana" : "Nova semana"} onClose={() => setOpen(false)} />

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Semana (ISO)">
              <Input style={{ opacity: editId ? 0.5 : 1 }} value={semana} disabled={!!editId} onChange={(e) => setSemana(e.target.value)} placeholder="2026-W25" />
            </Field>
            <Field label="Objetivo da sprint">
              <Input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
            </Field>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="ce-label">KPIs</span>
              <Button type="button" variant="ghost" onClick={() => setKpis((k) => [...k, emptyKpi()])}>+ KPI</Button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 4 }}>
              {["Métrica", "Início", "Meta", "Atual", ""].map((h, i) => <span key={i} style={{ color: "var(--faint)", fontSize: 11 }}>{h}</span>)}
            </div>
            {kpis.map((k, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 6 }}>
                <Input value={k.metrica} onChange={(e) => updKpi(i, { metrica: e.target.value })} placeholder="seguidores IG" />
                <Input value={k.valorInicio || ""} onChange={(e) => updKpi(i, { valorInicio: e.target.value })} />
                <Input value={k.valorMeta || ""} onChange={(e) => updKpi(i, { valorMeta: e.target.value })} />
                <Input value={k.valorFinal || ""} onChange={(e) => updKpi(i, { valorFinal: e.target.value })} />
                <Button type="button" variant="ghost" onClick={() => setKpis((ks) => ks.filter((_, idx) => idx !== i))}>✕</Button>
              </div>
            ))}
          </div>

          <Field label="Observações">
            <Textarea style={{ minHeight: 50, resize: "vertical" }} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </Field>

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div>{editId && <Button type="button" variant="danger" onClick={remove} disabled={saving}>Excluir</Button>}</div>
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
