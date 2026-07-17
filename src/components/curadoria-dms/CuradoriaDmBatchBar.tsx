"use client"

import { Button } from "@/components/ui/primitives"
import { tk } from "@/lib/tokens"

type Props = {
  count: number
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onClear: () => void
}

export default function CuradoriaDmBatchBar({
  count,
  busy,
  onApprove,
  onReject,
  onClear,
}: Props) {
  if (count === 0) return null

  return (
    <div
      className="ce-surface"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.75rem 1rem",
        marginBottom: "1rem",
        border: `1px solid color-mix(in oklch, ${tk.accent} 30%, ${tk.border})`,
      }}
    >
      <p style={{ fontSize: "var(--text-sm)", color: tk.muted }}>
        {count} selecionado{count === 1 ? "" : "s"}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button variant="ghost" onClick={onClear} disabled={busy}>
          Limpar
        </Button>
        <Button variant="danger" onClick={onReject} disabled={busy}>
          Rejeitar selecionados
        </Button>
        <Button onClick={onApprove} disabled={busy}>
          Aprovar selecionados
        </Button>
      </div>
    </div>
  )
}

export type BatchFailure = { id: number; code: string; message: string }

export function formatBatchSummary(
  succeeded: number,
  failed: BatchFailure[],
): string {
  if (failed.length === 0) {
    return `${succeeded} registro(s) processado(s) com sucesso.`
  }
  const lines = failed.map((f) => `#${f.id}: ${f.message}`).join("\n")
  return `${succeeded} ok, ${failed.length} falha(s):\n${lines}`
}
