"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface,
} from "@/components/ui/primitives"

type Cred = { id: string; chave: string; categoria: string; notas: string | null; global: boolean; createdAt: string }
type Log = { acao: string; credencialChave: string; usuarioEmail: string; data: string }

const ACAO_COR: Record<string, string> = {
  CRIADA: "var(--success)", REVELADA: "var(--warning)", EDITADA: "var(--cyan)", EXCLUIDA: "var(--danger)", REVELACAO_NEGADA: "var(--danger)",
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

  const [reveal, setReveal] = useState<Cred | null>(null)
  const [senhaMestra, setSenhaMestra] = useState("")
  const [totpCode, setTotpCode] = useState("")
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
      else if (valor.trim()) payload.valor = valor
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

  function openReveal(c: Cred) { setReveal(c); setSenhaMestra(""); setTotpCode(""); setRevealed(null); setRevealError(null) }
  function closeReveal() { setReveal(null); setSenhaMestra(""); setTotpCode(""); setRevealed(null); setRevealError(null) }

  async function doReveal(e: React.FormEvent) {
    e.preventDefault()
    if (!reveal) return
    setRevealing(true); setRevealError(null)
    try {
      const res = await fetch(`/api/credenciais/${reveal.id}/reveal`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senhaMestra, totpCode: totpCode || undefined }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao revelar.")
      setRevealed(b.valor)
      router.refresh()
    } catch (err: any) { setRevealError(err.message) } finally { setRevealing(false) }
  }

  return (
    <>
      <div className="ce-page-header-actions" style={{ justifyContent: "flex-end", marginBottom: "var(--space-md)" }}>
        <Button onClick={openNew}>+ Nova credencial</Button>
      </div>

      <Surface className="ce-data-table" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Categoria", "Chave", "Valor", "Notas", "Ações"].map((h) => (
                <th key={h} className="ce-kicker" style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.65rem" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {credenciais.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", background: "var(--border)", borderRadius: 4, fontSize: 12, color: "var(--muted-foreground)" }}>{c.categoria}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--foreground)", fontSize: 13 }}>{c.chave}</td>
                <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 13, letterSpacing: 2 }} data-mono="true">••••••••</td>
                <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 12 }}>{c.notas ?? "—"}</td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 6 }}>
                  <Button variant="ghost" onClick={() => openReveal(c)} style={{ padding: "4px 10px", fontSize: 12, color: "var(--warning)" }}>Ver</Button>
                  <Button variant="ghost" onClick={() => openEdit(c)} style={{ padding: "4px 10px", fontSize: 12 }}>Editar</Button>
                  <Button variant="danger" onClick={() => remove(c)} style={{ padding: "4px 10px", fontSize: 12 }}>Excluir</Button>
                </td>
              </tr>
            ))}
            {credenciais.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: "center", color: "var(--faint)" }}>Nenhuma credencial cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </Surface>

      <Surface style={{ marginTop: "var(--space-xl)" }}>
        <h2 className="ce-section-title">Log de auditoria</h2>
        {logs.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 13 }}>Sem registros ainda.</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (ACAO_COR[l.acao] || "var(--faint)") + "20", color: ACAO_COR[l.acao] || "var(--faint)" }}>{l.acao}</span>
              <span style={{ color: "var(--foreground)", fontSize: 13 }}>{l.credencialChave}</span>
              <span style={{ color: "var(--faint)", fontSize: 12 }}>{l.usuarioEmail}</span>
              <span style={{ color: "var(--faint)", fontSize: 12, marginLeft: "auto" }}>{formatDate(l.data)}</span>
            </div>
          ))
        )}
      </Surface>

      <Modal open={openForm} onClose={() => !saving && setOpenForm(false)} maxWidth="29rem">
        <form onSubmit={save}>
          <ModalHeader title={editId ? "Editar credencial" : "Nova credencial"} onClose={() => !saving && setOpenForm(false)} />

          <div className="ce-form-grid" data-cols="2">
            <Field label="Categoria">
              <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Chave / usuário">
              <Input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="login, @handle, token..." required />
            </Field>
          </div>

          <Field label={editId ? "Valor (senha/token) — deixe vazio p/ manter" : "Valor (senha/token)"}>
            <Input type="password" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={editId ? "•••••• (inalterado)" : "será criptografado"} required={!editId} />
          </Field>

          <Field label="Notas">
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
          </Field>

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div />
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </FormActions>
        </form>
      </Modal>

      <Modal open={!!reveal} onClose={closeReveal} maxWidth="28rem">
        <ModalHeader title="Revelar credencial" onClose={closeReveal} />
        {reveal && (
          <p style={{ color: "var(--faint)", fontSize: 13, marginBottom: "var(--space-md)", marginTop: "-0.5rem" }}>
            {reveal.categoria} · {reveal.chave}
          </p>
        )}

        {revealed === null ? (
          <form onSubmit={doReveal}>
            <Field label="Senha mestra (sua senha de conta)">
              <Input autoFocus type="password" value={senhaMestra} onChange={(e) => setSenhaMestra(e.target.value)} placeholder="confirme sua identidade" />
            </Field>
            <Field label="Código MFA (se ativo)">
              <Input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="000000" maxLength={6} />
            </Field>
            {revealError && <FormError>{revealError}</FormError>}
            <FormActions>
              <div />
              <div className="ce-form-actions-end">
                <Button type="button" variant="ghost" onClick={closeReveal}>Cancelar</Button>
                <Button type="submit" disabled={revealing || !senhaMestra} style={{ background: "var(--warning)", color: "var(--background)" }}>
                  {revealing ? "Verificando..." : "Revelar"}
                </Button>
              </div>
            </FormActions>
          </form>
        ) : (
          <div>
            <Field label="Valor">
              <div style={{ display: "flex", gap: 8 }}>
                <Input readOnly value={revealed} style={{ fontFamily: "var(--font-mono), monospace" }} onFocus={(e) => e.currentTarget.select()} />
                <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(revealed)}>Copiar</Button>
              </div>
            </Field>
            <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8 }}>Esta revelação foi registrada no log de auditoria.</p>
            <FormActions>
              <div />
              <div className="ce-form-actions-end">
                <Button onClick={closeReveal}>Fechar</Button>
              </div>
            </FormActions>
          </div>
        )}
      </Modal>
    </>
  )
}
