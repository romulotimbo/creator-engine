"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate, POST_STATUS_LABELS, TIPO_POST_LABELS, PLATAFORMA_LABELS } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface,
} from "@/components/ui/primitives"

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
        fetch(apiUrl(`/api/posts?personaId=${pid}&semData=true`)),
        fetch(apiUrl(`/api/posts?personaId=${pid}&status=AGENDADO`)),
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
      const res = await fetch(apiUrl(`/api/posts/${postId}`), {
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
        <Button type="button" onClick={openModal} disabled={personas.length === 0}>
          Agendar post
        </Button>
      </div>

      <Surface className="ce-data-table" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Data", "Persona", "Tipo", "Título", "Status"].map((h) => (
                <th key={h} className="ce-kicker" style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.65rem" }}>{h}</th>
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
      </Surface>

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} maxWidth="32.5rem">
        <form onSubmit={confirmar}>
          <ModalHeader title="Agendar post" onClose={() => !saving && setModalOpen(false)} />

          <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: "var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em" }}>1 — Persona</p>
          <Field label="Persona">
            <Select value={personaId} onChange={(e) => onPersonaChange(e.target.value)} required>
              <option value="">Selecione…</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>@{p.slug}{p.status === "SHADOW_BAN" ? " (shadow ban)" : ""}</option>
              ))}
            </Select>
          </Field>
          {shadowBan && (
            <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: "var(--space-md)" }}>Atenção: persona em shadow ban — revise antes de publicar.</p>
          )}

          <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: "var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em" }}>2 — Rede social</p>
          <Field label="Conta / plataforma">
            {!personaId ? (
              <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>Selecione uma persona primeiro.</p>
            ) : contas.length === 0 ? (
              <p style={{ color: "var(--warning)", fontSize: 13, margin: 0 }}>
                Nenhuma conta cadastrada. Cadastre contas no hub da persona.
              </p>
            ) : (
              <Select value={contaId} onChange={(e) => onContaChange(e.target.value)} required>
                <option value="">Selecione…</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{PLATAFORMA_LABELS[c.plataforma]} @{c.handle}</option>
                ))}
              </Select>
            )}
          </Field>

          <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: "var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em" }}>3 — Roteiro</p>
          <Field label="Post / roteiro">
            {!personaId ? (
              <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>Selecione uma persona primeiro.</p>
            ) : loadingRoteiros ? (
              <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>Carregando roteiros…</p>
            ) : roteirosFiltrados.length === 0 ? (
              <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>
                Nenhum roteiro disponível (pendente, aprovado ou reagendar). Crie roteiros em Personas → Roteiros.
              </p>
            ) : (
              <Select value={postId} onChange={(e) => setPostId(e.target.value)} required disabled={!contaId}>
                <option value="">Selecione…</option>
                {roteirosFiltrados.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{TIPO_POST_LABELS[r.tipo]}] {r.titulo} ({POST_STATUS_LABELS[r.status]})
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <p style={{ color: "var(--faint)", fontSize: 11, marginBottom: "var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em" }}>4 — Data e hora</p>
          <div className="ce-form-grid" data-cols="2">
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </Field>
            <Field label="Hora">
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
            </Field>
          </div>

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div />
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={saving || !personaId || !contaId || !postId || contas.length === 0}
              >
                {saving ? "Agendando…" : "Confirmar agendamento"}
              </Button>
            </div>
          </FormActions>
        </form>
      </Modal>
    </>
  )
}
