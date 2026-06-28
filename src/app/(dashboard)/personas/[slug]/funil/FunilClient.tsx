"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ChecklistItem = {
  id: string
  bloco: string
  descricao: string
  concluido: boolean
}

type Funil = {
  id: string
  urlLandingPage: string | null
  statusDeploy: string
  linkAfiliado: string | null
  plataformaAfil: string | null
  precoBaixo: string | null
  precoAlto: string | null
  observacoes: string | null
  checklistItems: ChecklistItem[]
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }

export default function FunilClient({
  slug,
  funil: initial,
  disclosureIa,
}: {
  slug: string
  funil: Funil | null
  disclosureIa: boolean
}) {
  const router = useRouter()
  const [modal, setModal] = useState(!initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [urlLandingPage, setUrl] = useState(initial?.urlLandingPage ?? "")
  const [statusDeploy, setStatus] = useState(initial?.statusDeploy ?? "planejada")
  const [linkAfiliado, setLink] = useState(initial?.linkAfiliado ?? "")
  const [plataformaAfil, setPlat] = useState(initial?.plataformaAfil ?? "")
  const [precoBaixo, setPB] = useState(initial?.precoBaixo ?? "")
  const [precoAlto, setPA] = useState(initial?.precoAlto ?? "")
  const [observacoes, setObs] = useState(initial?.observacoes ?? "")

  async function saveFunil(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const method = initial ? "PUT" : "POST"
      const res = await fetch(`/api/personas/${slug}/funil`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlLandingPage: urlLandingPage || null,
          statusDeploy,
          linkAfiliado: linkAfiliado || null,
          plataformaAfil: plataformaAfil || null,
          precoBaixo: precoBaixo ? Number(precoBaixo) : null,
          precoAlto: precoAlto ? Number(precoAlto) : null,
          observacoes: observacoes || null,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar funil.")
      }
      setModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleItem(item: ChecklistItem) {
    setBusyId(item.id)
    setError(null)
    try {
      const res = await fetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluido: !item.concluido }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao atualizar item.")
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!initial) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--faint)", marginBottom: 16 }}>Nenhum funil configurado para esta persona.</p>
        <button onClick={() => setModal(true)} style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
          Configurar Funil
        </button>
        {modal && renderModal()}
      </div>
    )
  }

  function renderModal() {
    return (
      <div onClick={() => !saving && setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 50 }}>
        <form onClick={(e) => e.stopPropagation()} onSubmit={saveFunil} style={{ width: "100%", maxWidth: 520, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 18 }}>Configurar Funil</h2>
          {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "grid", gap: 14 }}>
            <div><label style={label}>URL Landing Page</label><input style={input} value={urlLandingPage} onChange={(e) => setUrl(e.target.value)} /></div>
            <div>
              <label style={label}>Status deploy</label>
              <select style={input} value={statusDeploy} onChange={(e) => setStatus(e.target.value)}>
                {["planejada", "em_construcao", "no_ar", "offline"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={label}>Link afiliado</label><input style={input} value={linkAfiliado} onChange={(e) => setLink(e.target.value)} /></div>
            <div><label style={label}>Plataforma afiliado</label><input style={input} value={plataformaAfil} onChange={(e) => setPlat(e.target.value)} placeholder="braip, monetizze" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={label}>Preço baixo (R$)</label><input style={input} type="number" step="0.01" value={precoBaixo} onChange={(e) => setPB(e.target.value)} /></div>
              <div><label style={label}>Preço alto (R$)</label><input style={input} type="number" step="0.01" value={precoAlto} onChange={(e) => setPA(e.target.value)} /></div>
            </div>
            <div><label style={label}>Observações</label><textarea style={{ ...input, minHeight: 72 }} value={observacoes} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setModal(false)} style={{ padding: "9px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, cursor: "pointer" }}>{saving ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setModal(true)} style={{ padding: "8px 14px", background: "transparent", color: "var(--accent)", border: "1px solid color-mix(in oklch, var(--accent) 40%, transparent)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Editar funil</button>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 12 }}>Landing Page</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>URL: {initial.urlLandingPage ?? "—"}</p>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Status: {initial.statusDeploy}</p>
        {initial.linkAfiliado && <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>Afiliado: {initial.linkAfiliado}</p>}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 12 }}>Checklist</h2>
        {!disclosureIa && (
          <p style={{ color: "var(--warning)", fontSize: 12, marginBottom: 12 }}>Itens do Bloco B2 exigem disclosure de IA ativo (RN-05).</p>
        )}
        {initial.checklistItems.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busyId === item.id}
            onClick={() => toggleItem(item)}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "8px 0", borderBottom: "1px solid var(--border)", background: "transparent",
              border: "none", borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--border)",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ width: 20, height: 20, borderRadius: 4, background: item.concluido ? "var(--success)" : "var(--border)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
              {item.concluido ? "✓" : ""}
            </span>
            <span style={{ color: item.concluido ? "var(--faint)" : "var(--foreground)", fontSize: 13, textDecoration: item.concluido ? "line-through" : "none" }}>
              [{item.bloco}] {item.descricao}
            </span>
          </button>
        ))}
      </div>
      {modal && renderModal()}
    </div>
  )
}
