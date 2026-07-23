"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import { servicoDisplayLabel } from "@/lib/credenciais"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, SectionTitle,
} from "@/components/ui/primitives"

export type CredRow = {
  id: string
  chave: string
  categoria: string
  servico?: string | null
  notas: string | null
  global: boolean
  ferramentaId?: string | null
  ferramentaNome?: string | null
  createdAt: string
}

export type CredLog = {
  acao: string
  credencialChave: string
  usuarioEmail: string
  data: string
}

const ACAO_COR: Record<string, string> = {
  CRIADA: "var(--success)",
  REVELADA: "var(--warning)",
  EDITADA: "var(--cyan)",
  EXCLUIDA: "var(--danger)",
  REVELACAO_NEGADA: "var(--danger)",
}

const CATEGORIAS_PERSONA = ["instagram", "tiktok", "youtube", "fanvue", "braip", "proxy", "email", "outro"]
const CATEGORIAS_GLOBAL = ["runpod", "comfyui", "midjourney", "dolphin", "proxy", "api", "email", "outro"]

type FerramentaOpt = { id: string; nome: string }

export default function CredenciaisPanel({
  escopo,
  personaId,
  contaTrafegoId,
  ferramentas = [],
  credenciais,
  logs,
  loadError = null,
  personaCredHint = 0,
  showHeader = true,
}: {
  escopo: "persona" | "global" | "contaTrafego"
  personaId?: string
  contaTrafegoId?: string
  ferramentas?: FerramentaOpt[]
  credenciais: CredRow[]
  logs: CredLog[]
  loadError?: string | null
  personaCredHint?: number
  showHeader?: boolean
}) {
  const router = useRouter()
  const isGlobal = escopo === "global"
  const categorias = isGlobal ? CATEGORIAS_GLOBAL : CATEGORIAS_PERSONA

  const [rows, setRows] = useState(credenciais)
  const [auditLogs, setAuditLogs] = useState(logs)

  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [categoria, setCategoria] = useState(categorias[0])
  const [chave, setChave] = useState("")
  const [valor, setValor] = useState("")
  const [notas, setNotas] = useState("")
  const [ferramentaId, setFerramentaId] = useState("")
  const [servico, setServico] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [reveal, setReveal] = useState<CredRow | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [revealError, setRevealError] = useState<string | null>(null)

  useEffect(() => {
    setRows(credenciais)
  }, [credenciais])

  useEffect(() => {
    setAuditLogs(logs)
  }, [logs])

  function openNew() {
    setEditId(null)
    setCategoria(categorias[0])
    setChave("")
    setValor("")
    setNotas("")
    setFerramentaId("")
    setServico("")
    setError(null)
    setOpenForm(true)
  }

  function openEdit(c: CredRow) {
    setEditId(c.id)
    setCategoria(c.categoria)
    setChave(c.chave)
    setValor("")
    setNotas(c.notas || "")
    setFerramentaId(c.ferramentaId || "")
    setServico(c.servico || "")
    setError(null)
    setOpenForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const editing = !!editId
      const payload: Record<string, unknown> = { categoria, chave, notas, global: isGlobal }
      if (isGlobal) {
        payload.ferramentaId = ferramentaId || null
        payload.servico = servico.trim() || null
      } else if (escopo === "contaTrafego" && contaTrafegoId) {
        payload.contaTrafegoId = contaTrafegoId
      } else if (personaId) {
        payload.personaId = personaId
      }
      if (!editing) payload.valor = valor
      else if (valor.trim()) payload.valor = valor

      const res = await fetch(editing ? apiUrl(`/api/credenciais/${editId}`) : apiUrl("/api/credenciais"), {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.")
      }
      setOpenForm(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function remove(c: CredRow) {
    if (!confirm(`Excluir a credencial "${c.chave}"? A ação fica registrada no log.`)) return
    const res = await fetch(apiUrl(`/api/credenciais/${c.id}`), { method: "DELETE" })
    if (res.ok) {
      router.refresh()
    } else alert("Falha ao excluir.")
  }

  function openReveal(c: CredRow) {
    setReveal(c)
    setRevealed(null)
    setRevealError(null)
  }

  function closeReveal() {
    setReveal(null)
    setRevealed(null)
    setRevealError(null)
  }

  async function doReveal(e: React.FormEvent) {
    e.preventDefault()
    if (!reveal) return
    setRevealing(true)
    setRevealError(null)
    try {
      const res = await fetch(apiUrl(`/api/credenciais/${reveal.id}/reveal`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao revelar.")
      setRevealed(b.valor)
      router.refresh()
    } catch (err: unknown) {
      setRevealError(err instanceof Error ? err.message : "Falha ao revelar.")
    } finally {
      setRevealing(false)
    }
  }

  const headers = isGlobal
    ? ["Categoria", "Serviço", "Chave", "Valor", "Notas", "Ações"]
    : ["Categoria", "Chave", "Valor", "Notas", "Ações"]

  return (
    <>
      {showHeader && (
        <div className="ce-page-header-actions" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)", marginTop: isGlobal ? "var(--space-xl)" : 0 }}>
          {isGlobal ? <SectionTitle>Credenciais globais</SectionTitle> : <div />}
          <Button onClick={openNew}>+ Nova credencial</Button>
        </div>
      )}
      {!showHeader && (
        <div className="ce-page-header-actions" style={{ justifyContent: "flex-end", marginBottom: "var(--space-md)" }}>
          <Button onClick={openNew}>+ Nova credencial</Button>
        </div>
      )}

      {loadError && (
        <Surface style={{ marginBottom: "var(--space-md)", borderColor: "var(--warning)" }}>
          <p style={{ color: "var(--warning)", fontSize: 13, margin: 0 }}>
            Erro ao carregar credenciais do servidor. Migration pendente? Rode <code>prisma db push</code> ou os scripts em <code>prisma/sql/</code>.
          </p>
          <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8, marginBottom: 0 }}>{loadError}</p>
        </Surface>
      )}

      {isGlobal && personaCredHint > 0 && rows.length === 0 && !loadError && (
        <Surface style={{ marginBottom: "var(--space-md)", borderColor: "var(--border)" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: 0 }}>
            Há {personaCredHint} credencial(is) vinculada(s) a personas (ex.: veesemfiltro) — elas aparecem em{" "}
            <strong>Personas → Credenciais</strong>, não aqui. Cadastre credenciais de infra (RunPod, proxy, API) com{" "}
            <strong>+ Nova credencial</strong> nesta seção.
          </p>
        </Surface>
      )}

      <Surface className="ce-data-table" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {headers.map((h) => (
                <th key={h} className="ce-kicker" style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.65rem" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", background: "var(--border)", borderRadius: 4, fontSize: 12, color: "var(--muted-foreground)" }}>{c.categoria}</span>
                </td>
                {isGlobal && (
                  <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 12 }}>{servicoDisplayLabel(c)}</td>
                )}
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} style={{ padding: 48, textAlign: "center", color: "var(--faint)" }}>
                  {isGlobal ? "Nenhuma credencial global cadastrada." : "Nenhuma credencial cadastrada."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Surface>

      <Surface style={{ marginTop: "var(--space-xl)" }}>
        <h2 className="ce-section-title">Log de auditoria</h2>
        {auditLogs.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 13 }}>Sem registros ainda.</p>
        ) : (
          auditLogs.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < auditLogs.length - 1 ? "1px solid var(--border)" : "none" }}>
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
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Chave / usuário">
              <Input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="login, token, API key..." required />
            </Field>
          </div>

          {isGlobal && (
            <Field label="Serviço / provedor">
              <Input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="ex.: IPRoyal, RunPod, ComfyUI" />
            </Field>
          )}

          {isGlobal && ferramentas.length > 0 && (
            <Field label="Vínculo registro Ferramenta (opcional)">
              <Select value={ferramentaId} onChange={(e) => setFerramentaId(e.target.value)}>
                <option value="">— nenhuma —</option>
                {ferramentas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </Select>
            </Field>
          )}

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
            <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: "var(--space-md)" }}>
              Sua sessão Authelia já autenticou o acesso. A revelação será registrada no log de auditoria.
            </p>
            {revealError && <FormError>{revealError}</FormError>}
            <FormActions>
              <div />
              <div className="ce-form-actions-end">
                <Button type="button" variant="ghost" onClick={closeReveal}>Cancelar</Button>
                <Button type="submit" disabled={revealing} style={{ background: "var(--warning)", color: "var(--background)" }}>
                  {revealing ? "Revelando..." : "Revelar"}
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
