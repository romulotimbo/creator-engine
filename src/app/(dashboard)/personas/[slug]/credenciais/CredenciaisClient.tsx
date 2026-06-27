"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

type Cred = { id: string; chave: string; categoria: string; notas: string | null; global: boolean; createdAt: string }
type Log = { acao: string; credencialChave: string; usuarioEmail: string; data: string }

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "#0a0a0f", border: "1px solid #2d2d3f",
  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 5 }

const ACAO_COR: Record<string, string> = {
  CRIADA: "#34d399", REVELADA: "#fbbf24", EDITADA: "#60a5fa", EXCLUIDA: "#f87171", REVELACAO_NEGADA: "#f87171",
}

const CATEGORIAS = ["instagram", "tiktok", "youtube", "fanvue", "braip", "proxy", "email", "outro"]

export default function CredenciaisClient({
  personaId, credenciais, logs,
}: {
  personaId: string; credenciais: Cred[]; logs: Log[]
}) {
  const router = useRouter()
  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [categoria, setCategoria] = useState("instagram")
  const [chave, setChave] = useState("")
  const [valor, setValor] = useState("")
  const [notas, setNotas] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // reveal
  const [reveal, setReveal] = useState<Cred | null>(null)
  const [senhaMestra, setSenhaMestra] = useState("")
  const [revealed, setRevealed] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [revealError, setRevealError] = useState<string | null>(null)

  function openNew() { setEditId(null); setCategoria("instagram"); setChave(""); setValor(""); setNotas(""); setError(null); setOpenForm(true) }
  function openEdit(c: Cred) { setEditId(c.id); setCategoria(c.categoria); setChave(c.chave); setValor(""); setNotas(c.notas || ""); setError(null); setOpenForm(true) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      const editing = !!editId
      const payload: any = { categoria, chave, notas }
      if (!editing) { payload.personaId = personaId; payload.valor = valor }
      else if (valor.trim()) payload.valor = valor // só re-criptografa se preenchido
      const res = await fetch(editing ? `/api/credenciais/${editId}` : "/api/credenciais", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.") }
      setOpenForm(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove(c: Cred) {
    if (!confirm(`Excluir a credencial "${c.chave}"? A ação fica registrada no log.`)) return
    const res = await fetch(`/api/credenciais/${c.id}`, { method: "DELETE" })
    if (res.ok) router.refresh()
    else alert("Falha ao excluir.")
  }

  function openReveal(c: Cred) { setReveal(c); setSenhaMestra(""); setRevealed(null); setRevealError(null) }
  function closeReveal() { setReveal(null); setSenhaMestra(""); setRevealed(null); setRevealError(null) }

  async function doReveal(e: React.FormEvent) {
    e.preventDefault()
    if (!reveal) return
    setRevealing(true); setRevealError(null)
    try {
      const res = await fetch(`/api/credenciais/${reveal.id}/reveal`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senhaMestra }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao revelar.")
      setRevealed(b.valor)
      router.refresh() // atualiza o log de auditoria
    } catch (err: any) { setRevealError(err.message) } finally { setRevealing(false) }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={openNew} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Nova credencial</button>
      </div>

      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["Categoria", "Chave", "Valor", "Notas", "Ações"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#7d899c", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {credenciais.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", background: "#1e1e2e", borderRadius: 4, fontSize: 12, color: "#94a3b8" }}>{c.categoria}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#e2e8f0", fontSize: 13 }}>{c.chave}</td>
                <td style={{ padding: "12px 16px", color: "#7d899c", fontSize: 13, fontFamily: "monospace", letterSpacing: 2 }}>••••••••</td>
                <td style={{ padding: "12px 16px", color: "#7d899c", fontSize: 12 }}>{c.notas ?? "—"}</td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 6 }}>
                  <button onClick={() => openReveal(c)} style={{ padding: "4px 10px", background: "#1e1e2e", color: "#fbbf24", border: "1px solid #2d2d3f", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Ver</button>
                  <button onClick={() => openEdit(c)} style={{ padding: "4px 10px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Editar</button>
                  <button onClick={() => remove(c)} style={{ padding: "4px 10px", background: "transparent", color: "#f87171", border: "1px solid #2d2d3f", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Excluir</button>
                </td>
              </tr>
            ))}
            {credenciais.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: "center", color: "#7d899c" }}>Nenhuma credencial cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Audit log */}
      <div style={{ marginTop: 24, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Log de auditoria</h2>
        {logs.length === 0 ? (
          <p style={{ color: "#7d899c", fontSize: 13 }}>Sem registros ainda.</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < logs.length - 1 ? "1px solid #1e1e2e" : "none" }}>
              <span style={{ padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (ACAO_COR[l.acao] || "#7d899c") + "20", color: ACAO_COR[l.acao] || "#7d899c" }}>{l.acao}</span>
              <span style={{ color: "#e2e8f0", fontSize: 13 }}>{l.credencialChave}</span>
              <span style={{ color: "#7d899c", fontSize: 12 }}>{l.usuarioEmail}</span>
              <span style={{ color: "#7d899c", fontSize: 12, marginLeft: "auto" }}>{formatDate(l.data)}</span>
            </div>
          ))
        )}
      </div>

      {/* Modal criar/editar */}
      {openForm && (
        <div onClick={() => !saving && setOpenForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 50 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 460, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{editId ? "Editar credencial" : "Nova credencial"}</h2>
              <button type="button" onClick={() => setOpenForm(false)} style={{ background: "transparent", border: "none", color: "#7d899c", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Categoria</label>
                <select style={input} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={label}>Chave / usuário</label><input style={input} value={chave} onChange={(e) => setChave(e.target.value)} placeholder="login, @handle, token..." required /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Valor (senha/token) {editId && <span style={{ color: "#7d899c", fontWeight: 400 }}>— deixe vazio p/ manter</span>}</label>
              <input style={input} type="password" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={editId ? "•••••• (inalterado)" : "será criptografado"} required={!editId} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Notas</label>
              <input style={input} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setOpenForm(false)} style={{ padding: "10px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal reveal */}
      {reveal && (
        <div onClick={closeReveal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 20px", zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Revelar credencial</h2>
              <button onClick={closeReveal} style={{ background: "transparent", border: "none", color: "#7d899c", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 16 }}>{reveal.categoria} · {reveal.chave}</p>

            {revealed === null ? (
              <form onSubmit={doReveal}>
                <label style={label}>Senha mestra (sua senha de conta)</label>
                <input autoFocus style={input} type="password" value={senhaMestra} onChange={(e) => setSenhaMestra(e.target.value)} placeholder="confirme sua identidade" />
                {revealError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{revealError}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <button type="button" onClick={closeReveal} style={{ padding: "10px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                  <button type="submit" disabled={revealing || !senhaMestra} style={{ padding: "10px 20px", background: "#fbbf24", color: "#3a2a00", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: revealing || !senhaMestra ? 0.6 : 1 }}>{revealing ? "Verificando..." : "Revelar"}</button>
                </div>
              </form>
            ) : (
              <div>
                <label style={label}>Valor</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={revealed} style={{ ...input, fontFamily: "monospace" }} onFocus={(e) => e.currentTarget.select()} />
                  <button onClick={() => navigator.clipboard?.writeText(revealed)} style={{ padding: "0 14px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Copiar</button>
                </div>
                <p style={{ color: "#7d899c", fontSize: 12, marginTop: 8 }}>Esta revelação foi registrada no log de auditoria.</p>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button onClick={closeReveal} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
