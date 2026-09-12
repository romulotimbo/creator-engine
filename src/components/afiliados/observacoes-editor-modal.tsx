"use client"

import { useEffect, useState } from "react"
import { Button, FormActions, FormError, Modal, ModalHeader, Textarea } from "@/components/ui/primitives"

const PREVIEW_LEN = 140

export function previewObservacoes(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return null
  const firstLine = trimmed.split("\n")[0] ?? trimmed
  if (firstLine.length > PREVIEW_LEN) return `${firstLine.slice(0, PREVIEW_LEN)}…`
  return firstLine === trimmed ? firstLine : `${firstLine}…`
}

export function ObservacoesEntry({
  label,
  value,
  onOpen,
}: {
  label: string
  value: string | null
  onOpen: () => void
}) {
  const preview = previewObservacoes(value)
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: preview ? "var(--text)" : "var(--muted-foreground)", margin: "0 0 10px", whiteSpace: "pre-wrap" }}>
        {preview ?? "Nenhuma observação ainda"}
      </p>
      <Button type="button" variant="ghost" onClick={onOpen}>
        {preview ? "Editar observações" : "Abrir observações"}
      </Button>
    </div>
  )
}

export function ObservacoesEditorModal({
  open,
  title,
  value,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  value: string | null
  saving?: boolean
  error?: string | null
  onClose: () => void
  onSave: (text: string | null) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(value ?? "")

  useEffect(() => {
    if (open) setDraft(value ?? "")
  }, [open, value])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSave(draft.trim() === "" ? null : draft)
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="56rem">
      <form onSubmit={handleSubmit}>
        <ModalHeader title={title} onClose={onClose} />
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={18}
          style={{ minHeight: 320, resize: "vertical", fontFamily: "inherit" }}
          spellCheck
        />
        {error && <FormError>{error}</FormError>}
        <FormActions>
          <Button type="submit" disabled={saving}>{saving ? "…" : "Salvar"}</Button>
        </FormActions>
      </form>
    </Modal>
  )
}
