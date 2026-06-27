"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { slugify, PLATAFORMA_LABELS, PERSONA_STATUS_LABELS } from "@/lib/utils"

type Conta = {
  plataforma: string
  handle: string
  seguidoresAtual: string
  metaSeguidores: string
  statusConta: string
}

const card: React.CSSProperties = {
  background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, marginBottom: 20,
}
const label: React.CSSProperties = {
  display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 6,
}
const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "#0a0a0f", border: "1px solid #2d2d3f",
  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
}
const row: React.CSSProperties = { marginBottom: 16 }

function emptyConta(): Conta {
  return { plataforma: "INSTAGRAM", handle: "", seguidoresAtual: "0", metaSeguidores: "", statusConta: "ATIVA" }
}

export default function NovaPersonaPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nomeArtistico, setNomeArtistico] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [nicho, setNicho] = useState("")
  const [status, setStatus] = useState("TESTE")
  const [aparencia, setAparencia] = useState("")
  const [personalidade, setPersonalidade] = useState("")
  const [backstory, setBackstory] = useState("")
  const [incongruenciaCentral, setIncongruencia] = useState("")
  const [disclosureIa, setDisclosureIa] = useState(false)
  const [disclosureTexto, setDisclosureTexto] = useState("")
  const [dolphinProfileId, setDolphin] = useState("")
  const [proxyRef, setProxy] = useState("")
  const [contas, setContas] = useState<Conta[]>([emptyConta()])

  function onNome(v: string) {
    setNomeArtistico(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function updateConta(i: number, patch: Partial<Conta>) {
    setContas((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function addConta() { setContas((cs) => [...cs, emptyConta()]) }
  function removeConta(i: number) { setContas((cs) => cs.filter((_, idx) => idx !== i)) }

  const temFanvue = contas.some((c) => c.plataforma === "FANVUE")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (temFanvue && !disclosureIa) {
      setError("Conta FanVue exige disclosure de IA ativo (RN-02).")
      return
    }
    const plats = contas.filter((c) => c.handle.trim()).map((c) => c.plataforma)
    if (new Set(plats).size !== plats.length) {
      setError("Há mais de uma conta para a mesma plataforma.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, nomeArtistico, nicho, status,
          aparencia, personalidade, backstory, incongruenciaCentral,
          disclosureIa, disclosureTexto: disclosureIa ? disclosureTexto : undefined,
          dolphinProfileId, proxyRef,
          contas: contas
            .filter((c) => c.handle.trim())
            .map((c) => ({
              plataforma: c.plataforma,
              handle: c.handle.trim(),
              seguidoresAtual: Number(c.seguidoresAtual || 0),
              metaSeguidores: c.metaSeguidores ? Number(c.metaSeguidores) : undefined,
              statusConta: c.statusConta,
            })),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = typeof body.error === "string" ? body.error : "Falha ao criar persona."
        throw new Error(msg)
      }
      const created = await res.json()
      router.push(`/personas/${created.slug}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/personas" style={{ color: "#7d899c", fontSize: 13 }}>← Personas</Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginTop: 8 }}>Nova Persona</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Identidade */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>Identidade</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={row}>
              <label style={label}>Nome artístico *</label>
              <input style={input} value={nomeArtistico} onChange={(e) => onNome(e.target.value)} required />
            </div>
            <div style={row}>
              <label style={label}>Slug * (imutável após criar)</label>
              <input style={input} value={slug}
                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true) }} required />
            </div>
            <div style={row}>
              <label style={label}>Nicho *</label>
              <input style={input} value={nicho} onChange={(e) => setNicho(e.target.value)} required />
            </div>
            <div style={row}>
              <label style={label}>Status</label>
              <select style={input} value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(PERSONA_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={row}>
            <label style={label}>Aparência</label>
            <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={aparencia} onChange={(e) => setAparencia(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={row}>
              <label style={label}>Personalidade</label>
              <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={personalidade} onChange={(e) => setPersonalidade(e.target.value)} />
            </div>
            <div style={row}>
              <label style={label}>Incongruência central</label>
              <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={incongruenciaCentral} onChange={(e) => setIncongruencia(e.target.value)} />
            </div>
          </div>
          <div style={row}>
            <label style={label}>Backstory</label>
            <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={backstory} onChange={(e) => setBackstory(e.target.value)} />
          </div>
        </div>

        {/* Operacional / Anti-ban */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>Operacional (Anti-Ban — RN-01)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={row}>
              <label style={label}>Dolphin Anty profile ID</label>
              <input style={input} value={dolphinProfileId} onChange={(e) => setDolphin(e.target.value)} placeholder="profile único por persona" />
            </div>
            <div style={row}>
              <label style={label}>Proxy (IPRoyal)</label>
              <input style={input} value={proxyRef} onChange={(e) => setProxy(e.target.value)} placeholder="proxy dedicado" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input id="disc" type="checkbox" checked={disclosureIa} onChange={(e) => setDisclosureIa(e.target.checked)} />
            <label htmlFor="disc" style={{ color: "#e2e8f0", fontSize: 14 }}>Disclosure de IA ativo</label>
            {temFanvue && <span style={{ color: "#f59e0b", fontSize: 12 }}>obrigatório com FanVue</span>}
          </div>
          {disclosureIa && (
            <div style={{ ...row, marginTop: 12 }}>
              <label style={label}>Texto de disclosure</label>
              <input style={input} value={disclosureTexto} onChange={(e) => setDisclosureTexto(e.target.value)} />
            </div>
          )}
        </div>

        {/* Contas */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>Contas de plataforma</h2>
            <button type="button" onClick={addConta} style={{ background: "transparent", color: "#7c3aed", border: "1px solid #2d2d3f", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>+ Conta</button>
          </div>
          {contas.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 12 }}>
              <div>
                <label style={label}>Plataforma</label>
                <select style={input} value={c.plataforma} onChange={(e) => updateConta(i, { plataforma: e.target.value })}>
                  {Object.entries(PLATAFORMA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Handle</label>
                <input style={input} value={c.handle} onChange={(e) => updateConta(i, { handle: e.target.value })} placeholder="@usuario" />
              </div>
              <div>
                <label style={label}>Seguidores</label>
                <input style={input} type="number" min={0} value={c.seguidoresAtual} onChange={(e) => updateConta(i, { seguidoresAtual: e.target.value })} />
              </div>
              <div>
                <label style={label}>Meta</label>
                <input style={input} type="number" min={0} value={c.metaSeguidores} onChange={(e) => updateConta(i, { metaSeguidores: e.target.value })} />
              </div>
              <div>
                <label style={label}>Status</label>
                <select style={input} value={c.statusConta} onChange={(e) => updateConta(i, { statusConta: e.target.value })}>
                  <option value="ATIVA">Ativa</option>
                  <option value="SHADOW_BAN">Shadow Ban</option>
                  <option value="BANIDA">Banida</option>
                  <option value="PAUSADA">Pausada</option>
                </select>
              </div>
              <button type="button" onClick={() => removeConta(i)} title="Remover" style={{ background: "transparent", color: "#7d899c", border: "1px solid #2d2d3f", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}>✕</button>
            </div>
          ))}
          {contas.length === 0 && <p style={{ color: "#7d899c", fontSize: 13 }}>Sem contas — adicione ao menos uma para começar a operar.</p>}
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={saving} style={{ padding: "11px 22px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Criando..." : "Criar Persona"}
          </button>
          <Link href="/personas">
            <button type="button" style={{ padding: "11px 22px", background: "transparent", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          </Link>
        </div>
      </form>
    </div>
  )
}
