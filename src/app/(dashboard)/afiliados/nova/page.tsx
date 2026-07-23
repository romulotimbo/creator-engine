"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { slugify } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import { PLATAFORMA_ADS_LABELS, STATUS_CONTA_TRAFEGO_LABELS } from "@/lib/afiliados"
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  Select,
  Field,
  Surface,
  FormError,
  FormActions,
} from "@/components/ui/primitives"

export default function NovaContaTrafegoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [plataforma, setPlataforma] = useState("META")
  const [status, setStatus] = useState("ATIVA")
  const [observacoes, setObservacoes] = useState("")

  function onNome(v: string) {
    setNome(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiUrl("/api/afiliados"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, slug, plataforma, status, observacoes: observacoes || null }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao criar")
      router.push(`/afiliados/${b.slug}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao criar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title="Nova conta de tráfego"
        description="Hub operacional de anúncios + produtos afiliados"
        actions={
          <Link href="/afiliados">
            <Button variant="ghost">Cancelar</Button>
          </Link>
        }
      />

      <Surface className="ce-animate-in" style={{ maxWidth: 560 }}>
        <form onSubmit={save}>
          <Field label="Nome">
            <Input value={nome} onChange={(e) => onNome(e.target.value)} required />
          </Field>
          <Field label="Slug">
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              required
            />
          </Field>
          <Field label="Plataforma de ads">
            <Select value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
              {Object.entries(PLATAFORMA_ADS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_CONTA_TRAFEGO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Observações">
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </Field>
          {error && <FormError>{error}</FormError>}
          <FormActions>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar conta"}</Button>
          </FormActions>
        </form>
      </Surface>
    </div>
  )
}
