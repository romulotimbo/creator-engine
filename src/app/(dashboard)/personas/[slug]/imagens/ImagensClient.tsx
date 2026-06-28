"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormActions, Surface, EmptyState, SectionTitle,
} from "@/components/ui/primitives"

type Imagem = {
  id: string
  ferramenta: string
  prompt: string
  resultado: string | null
  status: string
  createdAt: string
}

type Fluxo = {
  id: string
  nome: string
  ferramenta: string
  objetivo: string
  confianca: number
  instrucoes: string
  ativo: boolean
  ferramentaRef: { id: string; nome: string } | null
}

export default function ImagensClient({
  personaId,
  slug,
  imagens: initial,
  fluxos,
}: {
  personaId: string
  slug: string
  imagens: Imagem[]
  fluxos: Fluxo[]
}) {
  const router = useRouter()
  const [modal, setModal] = useState<"imagem" | "fluxo" | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveImagem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/imagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          ferramenta: fd.get("ferramenta"),
          prompt: fd.get("prompt"),
          resultado: fd.get("resultado") || null,
          status: fd.get("status"),
          notas: fd.get("notas") || null,
        }),
      })
      if (!res.ok) throw new Error("Falha")
      setModal(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function saveFluxo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/fluxos-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          nome: fd.get("nome"),
          ferramenta: fd.get("ferramenta"),
          objetivo: fd.get("objetivo"),
          confianca: Number(fd.get("confianca")),
          instrucoes: fd.get("instrucoes"),
        }),
      })
      if (!res.ok) throw new Error("Falha")
      setModal(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="ce-page-header-actions" style={{ marginBottom: "var(--space-xl)" }}>
        <Button onClick={() => setModal("imagem")}>+ Nova tentativa</Button>
        <Button variant="ghost" onClick={() => setModal("fluxo")} style={{ color: "var(--accent)", borderColor: "color-mix(in oklch, var(--accent) 40%, transparent)" }}>
          + Novo fluxo
        </Button>
      </div>

      {fluxos.length > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <SectionTitle>Fluxos documentados</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fluxos.map((f) => (
              <Surface key={f.id} style={{ padding: "var(--space-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ color: "var(--foreground)", fontWeight: 600 }}>{f.nome}</p>
                  <span style={{ color: "var(--faint)", fontSize: 12 }}>{f.ferramentaRef?.nome ?? f.ferramenta} · confiança {f.confianca}/5</span>
                </div>
                <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{f.objetivo}</p>
                <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>{f.instrucoes.slice(0, 160)}{f.instrucoes.length > 160 ? "…" : ""}</p>
              </Surface>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {initial.map((img) => (
          <Surface key={img.id}>
            {img.resultado && (
              <div style={{ aspectRatio: "1", background: "var(--border)", borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
                <img src={img.resultado} alt="Imagem gerada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <p style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 4 }}>{img.ferramenta} · {formatDate(img.createdAt)}</p>
            <p style={{ color: "var(--faint)", fontSize: 12, lineHeight: 1.5 }}>{img.prompt.slice(0, 100)}…</p>
            <span style={{ display: "inline-block", marginTop: 8, padding: "2px 8px", background: img.status === "aprovada" ? "var(--success)20" : "var(--faint)20", color: img.status === "aprovada" ? "var(--success)" : "var(--faint)", borderRadius: 4, fontSize: 11 }}>{img.status}</span>
          </Surface>
        ))}
        {initial.length === 0 && (
          <div style={{ gridColumn: "1/-1" }}>
            <EmptyState>
              Nenhuma imagem gerada ainda. Registre tentativas de geração aqui.
            </EmptyState>
          </div>
        )}
      </div>

      <Modal open={modal === "imagem"} onClose={() => !saving && setModal(null)} maxWidth="30rem">
        <form onSubmit={saveImagem}>
          <ModalHeader title="Nova tentativa" onClose={() => !saving && setModal(null)} />
          <Field label="Ferramenta">
            <Input name="ferramenta" required placeholder="magnific, flux…" />
          </Field>
          <Field label="Prompt">
            <Textarea name="prompt" style={{ minHeight: 100 }} required />
          </Field>
          <Field label="URL resultado">
            <Input name="resultado" placeholder="https://…" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="pendente">
              <option value="pendente">pendente</option>
              <option value="aprovada">aprovada</option>
              <option value="descartada">descartada</option>
            </Select>
          </Field>
          <Field label="Notas">
            <Textarea name="notas" style={{ minHeight: 60 }} />
          </Field>
          <FormActions>
            <div />
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>Salvar</Button>
            </div>
          </FormActions>
        </form>
      </Modal>

      <Modal open={modal === "fluxo"} onClose={() => !saving && setModal(null)} maxWidth="30rem">
        <form onSubmit={saveFluxo}>
          <ModalHeader title="Novo fluxo de imagem" onClose={() => !saving && setModal(null)} />
          <Field label="Nome">
            <Input name="nome" required />
          </Field>
          <Field label="Ferramenta">
            <Input name="ferramenta" required />
          </Field>
          <Field label="Objetivo">
            <Input name="objetivo" required />
          </Field>
          <Field label="Confiança (1-5)">
            <Input name="confianca" type="number" min={1} max={5} defaultValue={3} />
          </Field>
          <Field label="Instruções">
            <Textarea name="instrucoes" style={{ minHeight: 100 }} required />
          </Field>
          <FormActions>
            <div />
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>Salvar</Button>
            </div>
          </FormActions>
        </form>
      </Modal>
    </div>
  )
}
