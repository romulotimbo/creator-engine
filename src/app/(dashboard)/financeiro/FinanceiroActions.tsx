"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

type Persona = { id: string; slug: string }

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }
const today = () => new Date().toISOString().slice(0, 10)

export default function FinanceiroActions({ personas }: { personas: Persona[] }) {
  const router = useRouter()
  const [tipo, setTipo] = useState<"receita" | "custo" | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // campos
  const [personaId, setPersonaId] = useState("")
  const [valor, setValor] = useState("")
  const [data, setData] = useState(today())
  const [descricao, setDescricao] = useState("")
  const [canal, setCanal] = useState("fanvue")
  const [categoria, setCategoria] = useState("ferramenta")
  const [ferramenta, setFerramenta] = useState("")
  const [global, setGlobal] = useState(false)

  function open(t: "receita" | "custo") {
    setTipo(t); setError(null)
    setPersonaId(personas[0]?.id ?? ""); setValor(""); setData(today()); setDescricao("")
    setCanal("fanvue"); setCategoria("ferramenta"); setFerramenta(""); setGlobal(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!valor || Number(valor) <= 0) { setError("Informe um valor positivo."); return }
    if (tipo === "receita" && !personaId) { setError("Selecione a persona."); return }
    if (tipo === "custo" && !global && !personaId) { setError("Selecione a persona ou marque como global."); return }

    setSaving(true)
    try {
      const payload: any = tipo === "receita"
        ? { tipo, personaId, valor, canal, descricao, data }
        : { tipo, personaId: global ? null : personaId, valor, categoria, ferramenta, descricao, data, global }
      const res = await fetch("/api/financeiro", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.")
      }
      setTipo(null)
      router.refresh() // atualiza P&L (server component recalcula totais)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isReceita = tipo === "receita"

  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => open("receita")} style={{ padding: "9px 16px", background: "var(--success)", color: "var(--background)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Receita</button>
        <button onClick={() => open("custo")} style={{ padding: "9px 16px", background: "transparent", color: "var(--danger)", border: "1px solid rgba(248,113,113,0.4)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Custo</button>
      </div>

      {tipo && (
        <div onClick={() => !saving && setTipo(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 50 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 460, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: isReceita ? "var(--success)" : "var(--danger)" }}>{isReceita ? "Nova receita" : "Novo custo"}</h2>
              <button type="button" onClick={() => setTipo(null)} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {isReceita ? (
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Persona</label>
                <select style={input} value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                  {personas.map((p) => <option key={p.id} value={p.id}>@{p.slug}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Persona</label>
                <select style={{ ...input, opacity: global ? 0.5 : 1 }} value={personaId} disabled={global} onChange={(e) => setPersonaId(e.target.value)}>
                  {personas.map((p) => <option key={p.id} value={p.id}>@{p.slug}</option>)}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input id="glob" type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} />
                  <label htmlFor="glob" style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Custo global (não atribuído a uma persona)</label>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label}>Valor (R$)</label>
                <input style={input} type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required />
              </div>
              <div>
                <label style={label}>Data</label>
                <input style={input} type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
            </div>

            {isReceita ? (
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Canal</label>
                <select style={input} value={canal} onChange={(e) => setCanal(e.target.value)}>
                  {["fanvue", "braip", "ppv", "afiliado", "outro"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={label}>Categoria</label>
                  <select style={input} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    {["ferramenta", "proxy", "publicidade", "outro"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Ferramenta (opcional)</label>
                  <input style={input} value={ferramenta} onChange={(e) => setFerramenta(e.target.value)} placeholder="magnific, iproyal..." />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Descrição (opcional)</label>
              <input style={input} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>

            {error && (
              <div style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", color: "var(--danger)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setTipo(null)} style={{ padding: "10px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: isReceita ? "var(--success)" : "var(--danger)", color: isReceita ? "var(--background)" : "var(--background)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
