"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { slugify, PLATAFORMA_LABELS, PERSONA_STATUS_LABELS } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  Select,
  Field,
  Surface,
  SectionTitle,
  FormError,
  FormActions,
} from "@/components/ui/primitives"

type Conta = {
  plataforma: string
  handle: string
  seguidoresAtual: string
  metaSeguidores: string
  statusConta: string
}

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
    setContas(cs => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  const temFanvue = contas.some(c => c.plataforma === "FANVUE")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (temFanvue && !disclosureIa) {
      setError("Conta FanVue exige disclosure de IA ativo (RN-02).")
      return
    }
    const plats = contas.filter(c => c.handle.trim()).map(c => c.plataforma)
    if (new Set(plats).size !== plats.length) {
      setError("Há mais de uma conta para a mesma plataforma.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(apiUrl("/api/personas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, nomeArtistico, nicho, status,
          aparencia, personalidade, backstory, incongruenciaCentral,
          disclosureIa, disclosureTexto: disclosureIa ? disclosureTexto : undefined,
          dolphinProfileId, proxyRef,
          contas: contas
            .filter(c => c.handle.trim())
            .map(c => ({
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
        throw new Error(typeof body.error === "string" ? body.error : "Falha ao criar persona.")
      }
      const created = await res.json()
      router.push(`/personas/${created.slug}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao criar persona.")
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: "48rem" }}>
      <PageHeader
        kicker="PersonaForge"
        title="Nova Persona"
        description="Cria persona + contas de plataforma em uma transação"
        actions={
          <Link href="/personas" className="ce-export-link" data-muted="true">← Voltar</Link>
        }
      />

      <form onSubmit={handleSubmit} className="ce-animate-in">
        <Surface className="ce-form-section" style={{ padding: "var(--space-xl)" }}>
          <SectionTitle>Identidade</SectionTitle>
          <div className="ce-form-grid" data-cols="2">
            <Field label="Nome artístico *" htmlFor="nome">
              <Input id="nome" value={nomeArtistico} onChange={e => onNome(e.target.value)} required />
            </Field>
            <Field label="Slug * (imutável)" htmlFor="slug">
              <Input
                id="slug"
                value={slug}
                onChange={e => { setSlug(slugify(e.target.value)); setSlugTouched(true) }}
                required
              />
            </Field>
            <Field label="Nicho *" htmlFor="nicho">
              <Input id="nicho" value={nicho} onChange={e => setNicho(e.target.value)} required />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" value={status} onChange={e => setStatus(e.target.value)}>
                {Object.entries(PERSONA_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Aparência" htmlFor="aparencia">
            <Textarea id="aparencia" rows={3} value={aparencia} onChange={e => setAparencia(e.target.value)} />
          </Field>
          <div className="ce-form-grid" data-cols="2">
            <Field label="Personalidade" htmlFor="personalidade">
              <Textarea id="personalidade" rows={3} value={personalidade} onChange={e => setPersonalidade(e.target.value)} />
            </Field>
            <Field label="Incongruência central" htmlFor="incongruencia">
              <Textarea id="incongruencia" rows={3} value={incongruenciaCentral} onChange={e => setIncongruencia(e.target.value)} />
            </Field>
          </div>
          <Field label="Backstory" htmlFor="backstory">
            <Textarea id="backstory" rows={3} value={backstory} onChange={e => setBackstory(e.target.value)} />
          </Field>
        </Surface>

        <Surface className="ce-form-section" style={{ padding: "var(--space-xl)" }}>
          <SectionTitle>Operacional (Anti-Ban — RN-01)</SectionTitle>
          <div className="ce-form-grid" data-cols="2">
            <Field label="Dolphin Anty profile ID" htmlFor="dolphin">
              <Input id="dolphin" value={dolphinProfileId} onChange={e => setDolphin(e.target.value)} placeholder="profile único por persona" />
            </Field>
            <Field label="Proxy (IPRoyal)" htmlFor="proxy">
              <Input id="proxy" value={proxyRef} onChange={e => setProxy(e.target.value)} placeholder="proxy dedicado" />
            </Field>
          </div>
          <div className="ce-checkbox-row">
            <input id="disc" type="checkbox" checked={disclosureIa} onChange={e => setDisclosureIa(e.target.checked)} />
            <label htmlFor="disc">Disclosure de IA ativo</label>
            {temFanvue && <span style={{ color: "var(--warning)", fontSize: "var(--text-xs)" }}>obrigatório com FanVue</span>}
          </div>
          {disclosureIa && (
            <Field label="Texto de disclosure" htmlFor="disclosure-texto">
              <Input id="disclosure-texto" value={disclosureTexto} onChange={e => setDisclosureTexto(e.target.value)} />
            </Field>
          )}
        </Surface>

        <Surface className="ce-form-section" style={{ padding: "var(--space-xl)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <h2 className="ce-section-title" style={{ marginBottom: 0 }}>Contas de plataforma</h2>
            <Button type="button" variant="ghost" onClick={() => setContas(cs => [...cs, emptyConta()])}>
              + Conta
            </Button>
          </div>

          {contas.map((c, i) => (
            <div key={i} className="ce-conta-row">
              <Field label="Plataforma">
                <Select value={c.plataforma} onChange={e => updateConta(i, { plataforma: e.target.value })}>
                  {Object.entries(PLATAFORMA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Handle">
                <Input value={c.handle} onChange={e => updateConta(i, { handle: e.target.value })} placeholder="@usuario" />
              </Field>
              <Field label="Seguidores">
                <Input type="number" min={0} value={c.seguidoresAtual} onChange={e => updateConta(i, { seguidoresAtual: e.target.value })} />
              </Field>
              <Field label="Meta">
                <Input type="number" min={0} value={c.metaSeguidores} onChange={e => updateConta(i, { metaSeguidores: e.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={c.statusConta} onChange={e => updateConta(i, { statusConta: e.target.value })}>
                  <option value="ATIVA">Ativa</option>
                  <option value="SHADOW_BAN">Shadow Ban</option>
                  <option value="BANIDA">Banida</option>
                  <option value="PAUSADA">Pausada</option>
                </Select>
              </Field>
              <Button type="button" variant="ghost" onClick={() => setContas(cs => cs.filter((_, idx) => idx !== i))} title="Remover">
                ✕
              </Button>
            </div>
          ))}

          {contas.length === 0 && (
            <p style={{ color: "var(--faint)", fontSize: "var(--text-sm)" }}>
              Sem contas — adicione ao menos uma para começar a operar.
            </p>
          )}
        </Surface>

        {error && <FormError>{error}</FormError>}

        <FormActions>
          <div />
          <div className="ce-form-actions-end">
            <Link href="/personas">
              <Button type="button" variant="ghost">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Criando…" : "Criar Persona"}
            </Button>
          </div>
        </FormActions>
      </form>
    </div>
  )
}
