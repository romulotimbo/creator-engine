"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate, POST_STATUS_LABELS, TIPO_POST_LABELS, PLATAFORMA_LABELS } from "@/lib/utils"

type PostRow = {
  id: string
  titulo: string
  tipo: string
  status: string
  dataPublicacao: string | null
  personaSlug: string
  personaStatus: string
}

type Conta = { id: string; plataforma: string; handle: string }

type Persona = {
  id: string
  slug: string
  status: string
  contas: Conta[]
}

type Roteiro = {
  id: string
  titulo: string
  tipo: string
  status: string
  contaId: string | null
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }

const today = () => new Date().toISOString().slice(0, 10)

export default function CalendarioGlobalClient({
  posts,
  personas,
}: {
  posts: PostRow[]
  personas: Persona[]
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingRoteiros, setLoadingRoteiros] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [personaId, setPersonaId] = useState("")
  const [contaId, setContaId] = useState("")
  const [postId, setPostId] = useState("")
  const [data, setData] = useState(today())
  const [hora, setHora] = useState("12:00")
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])

  const persona = personas.find((p) => p.id === personaId)
  const contas = persona?.contas ?? []
  const shadowBan = persona?.status === "SHADOW_BAN"

  const roteirosFiltrados = useMemo(() => {
    if (!contaId) return roteiros
    return roteiros.filter((r) => !r.contaId || r.contaId === contaId)
  }, [roteiros, contaId])

  function openModal() {
    setModalOpen(true)
    setError(null)
    const first = personas[0]?.id ?? ""
    setPersonaId(first)
    setContaId("")
    setPostId("")
    setData(today())
    setHora("12:00")
    setRoteiros([])
    if (first) loadRoteiros(first)
  }

  async function loadRoteiros(pid: string) {
    setLoadingRoteiros(true)
    setError(null)
    try {
      const [semData, agendados] = await Promise.all([
        fetch(`/api/posts?personaId=${pid}&semData=true`),
        fetch(`/api/posts?personaId=${pid}&status=AGENDADO`),
      ])
      const a = semData.ok ? await semData.json() : []
      const b = agendados.ok ? await agendados.json() : []
      const map = new Map<string, Roteiro>()
      for (const p of [...a, ...b] as Roteiro[]) {
        if (["PENDENTE", "APROVADO", "AGENDADO"].includes(p.status)) {
          map.set(p.id, p)
        }
      }
      setRoteiros([...map.values()])
    } catch {
      setError("Falha ao carregar roteiros.")
      setRoteiros([])
    } finally {
      setLoadingRoteiros(false)
    }
  }

  function onPersonaChange(id: string) {
    setPersonaId(id)
    setContaId("")
    setPostId("")
    setRoteiros([])
    if (id) loadRoteiros(id)
  }

  function onContaChange(id: string) {
    setContaId(id)
    setPostId("")
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!personaId) { setError("Selecione uma persona."); return }
    if (!contaId) { setError("Selecione uma conta/plataforma."); return }
    if (!postId) { setError("Selecione um roteiro."); return }
    if (!data) { setError("Informe a data."); return }

    const [h, m] = hora.split(":").map(Number)
    const dataPublicacao = new Date(data + "T00:00:00")
    dataPublicacao.setHours(h || 12, m || 0, 0, 0)

    setSaving(true)
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contaId,
          dataPublicacao: dataPublicacao.toISOString(),
          status: "AGENDADO",
        }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao agendar.")

      setModalOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao agendar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>{posts.length} posts agendados ou aprovados</p>
        <button
          type="button"
          onClick={openModal}
          disabled={personas.length === 0}
          style={{
            padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none",
            borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: personas.length === 0 ? "not-allowed" : "pointer",
            opacity: personas.length === 0 ? 0.6 : 1,
          }}
        >
          Agendar post
        </button>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Data", "Persona", "Tipo", "Título", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--faint)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const shadow = p.personaStatus === "SHADOW_BAN"
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", background: shadow ? "rgba(248,113,113,0.06)" : undefined }}>
                  <td style={{ padding: "12px 16px", color: "var(--foreground)", fontSize: 13 }}>{formatDate(p.dataPublicacao)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    <span style={{ color: shadow ? "var(--danger)" : "var(--accent)", fontWeight: shadow ? 700 : 400 }}>
                      @{p.personaSlug}
                      {shadow && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--danger)" }}>SHADOW BAN</span>}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", background: "var(--border)", borderRadius: 4, fontSize: 12, color: "var(--muted-foreground)" }}>{TIPO_POST_LABELS[p.tipo]}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--foreground)", fontSize: 13, maxWidth: 300 }}>{p.titulo}</td>
                  <td style={{ padding: "12px 16px", color: "var(--accent)", fontSize: 13 }}>{POST_STATUS_LABELS[p.status]}</td>
                </tr>
              )
            })}
            {posts.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: "center", color: "var(--faint)" }}>Nenhum post agendado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          onClick={() => !saving && setModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", zIndex: 50 }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmar}
            style={{ width: "100%", maxWidth: 520, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Agendar post</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>1 — Persona</p>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Persona</label>
              <select style={input} value={personaId} onChange={(e) => onPersonaChange(e.target.value)} required>
                <option value="">Selecione…</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>@{p.slug}{p.status === "SHADOW_BAN" ? " (shadow ban)" : ""}</option>
                ))}
              </select>
              {shadowBan && (
                <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>Atenção: persona em shadow ban — revise antes de publicar.</p>
              )}
            </div>

            <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>2 — Rede social</p>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Conta / plataforma</label>
              {!personaId ? (
                <p style={{ color: "var(--faint)", fontSize: 13 }}>Selecione uma persona primeiro.</p>
              ) : contas.length === 0 ? (
                <p style={{ color: "var(--warning)", fontSize: 13 }}>
                  Nenhuma conta cadastrada. Cadastre contas no hub da persona.
                </p>
              ) : (
                <select style={input} value={contaId} onChange={(e) => onContaChange(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{PLATAFORMA_LABELS[c.plataforma]} @{c.handle}</option>
                  ))}
                </select>
              )}
            </div>

            <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>3 — Roteiro</p>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Post / roteiro</label>
              {!personaId ? (
                <p style={{ color: "var(--faint)", fontSize: 13 }}>Selecione uma persona primeiro.</p>
              ) : loadingRoteiros ? (
                <p style={{ color: "var(--faint)", fontSize: 13 }}>Carregando roteiros…</p>
              ) : roteirosFiltrados.length === 0 ? (
                <p style={{ color: "var(--faint)", fontSize: 13 }}>
                  Nenhum roteiro disponível (pendente, aprovado ou reagendar). Crie roteiros em Personas → Roteiros.
                </p>
              ) : (
                <select style={input} value={postId} onChange={(e) => setPostId(e.target.value)} required disabled={!contaId}>
                  <option value="">Selecione…</option>
                  {roteirosFiltrados.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{TIPO_POST_LABELS[r.tipo]}] {r.titulo} ({POST_STATUS_LABELS[r.status]})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>4 — Data e hora</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={label}>Data</label>
                <input style={input} type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              <div>
                <label style={label}>Hora</label>
                <input style={input} type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
              </div>
            </div>

            {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ padding: "9px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button
                type="submit"
                disabled={saving || !personaId || !contaId || !postId || contas.length === 0}
                style={{ padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Agendando…" : "Confirmar agendamento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
