"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState, StatCard, SectionTitle,
} from "@/components/ui/primitives"

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
      const res = await fetch(apiUrl(`/api/personas/${slug}/funil`), {
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
      const res = await fetch(apiUrl(`/api/checklist/${item.id}`), {
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

  const funilModal = (
    <Modal open={modal} onClose={() => !saving && setModal(false)} maxWidth="520px">
      <form onSubmit={saveFunil}>
        <ModalHeader title="Configurar Funil" onClose={() => setModal(false)} />
        {error && <FormError>{error}</FormError>}
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="URL Landing Page">
            <Input value={urlLandingPage} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Field label="Status deploy">
            <Select value={statusDeploy} onChange={(e) => setStatus(e.target.value)}>
              {["planejada", "em_construcao", "no_ar", "offline"].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Link afiliado">
            <Input value={linkAfiliado} onChange={(e) => setLink(e.target.value)} />
          </Field>
          <Field label="Plataforma afiliado">
            <Input value={plataformaAfil} onChange={(e) => setPlat(e.target.value)} placeholder="braip, monetizze" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Preço baixo (R$)">
              <Input type="number" step="0.01" value={precoBaixo} onChange={(e) => setPB(e.target.value)} />
            </Field>
            <Field label="Preço alto (R$)">
              <Input type="number" step="0.01" value={precoAlto} onChange={(e) => setPA(e.target.value)} />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea style={{ minHeight: 72 }} value={observacoes} onChange={(e) => setObs(e.target.value)} />
          </Field>
        </div>
        <FormActions>
          <div />
          <div className="ce-form-actions-end">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </FormActions>
      </form>
    </Modal>
  )

  if (!initial) {
    return (
      <EmptyState>
        <p style={{ marginBottom: 16 }}>Nenhum funil configurado para esta persona.</p>
        <Button onClick={() => setModal(true)}>Configurar Funil</Button>
        {funilModal}
      </EmptyState>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <FormError>{error}</FormError>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={() => setModal(true)}>Editar funil</Button>
      </div>
      <Surface>
        <SectionTitle>Landing Page</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          <StatCard label="URL" value={initial.urlLandingPage ?? "—"} />
          <StatCard label="Status deploy" value={initial.statusDeploy} />
          {initial.linkAfiliado && <StatCard label="Afiliado" value={initial.linkAfiliado} />}
        </div>
      </Surface>
      <Surface>
        <SectionTitle>Checklist</SectionTitle>
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
      </Surface>
      {funilModal}
    </div>
  )
}
