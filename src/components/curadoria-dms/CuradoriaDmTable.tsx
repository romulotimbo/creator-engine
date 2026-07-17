"use client"

import type { CuradoriaDmRow, CuradoriaWindowSort } from "@/lib/curadoria-dms-shared"
import { formatCuradoriaDateTime, formatWindowHours } from "@/lib/curadoria-dms-shared"
import { Button, Select, Textarea } from "@/components/ui/primitives"
import { MessageSquareText } from "lucide-react"
import { tk } from "@/lib/tokens"

const ROW_STATUS_OPTIONS = [
  { value: "pending_review", label: "Pendente" },
  { value: "approved", label: "Aprovar" },
  { value: "rejected", label: "Rejeitar" },
] as const

type Props = {
  items: CuradoriaDmRow[]
  selectedIds: Set<number>
  savingIds: Set<number>
  draftTexts: Record<number, string>
  selectValues: Record<number, string>
  rowErrors: Record<number, string>
  onToggle: (id: number) => void
  onToggleAll: (checked: boolean) => void
  onFinalTextChange: (id: number, text: string) => void
  onStatusChange: (id: number, status: "approved" | "rejected") => void
  onRowFocus: (id: number) => void
  onRowBlur: (id: number) => void
  onOpenHistorico: (row: CuradoriaDmRow) => void
  windowSort: CuradoriaWindowSort
  onToggleWindowSort: () => void
}

function clip(text: string | null, max = 120): string {
  if (!text) return "—"
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function defaultFinalText(row: CuradoriaDmRow): string {
  return row.finalText ?? row.draftText ?? ""
}

export default function CuradoriaDmTable({
  items,
  selectedIds,
  savingIds,
  draftTexts,
  selectValues,
  rowErrors,
  onToggle,
  onToggleAll,
  onFinalTextChange,
  onStatusChange,
  onRowFocus,
  onRowBlur,
  onOpenHistorico,
  windowSort,
  onToggleWindowSort,
}: Props) {
  const allSelected = items.length > 0 && items.every((r) => selectedIds.has(r.id))

  return (
    <div className="ce-surface ce-data-table" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tk.border}` }}>
            {[
              { key: "sel", label: "" },
              { key: "id", label: "ID" },
              { key: "username", label: "Username" },
              { key: "contexto", label: "Contexto" },
              { key: "rascunho", label: "Rascunho" },
              { key: "final", label: "Final" },
              { key: "stage", label: "Stage" },
              { key: "inbound", label: "Última inbound" },
              { key: "janela", label: "Janela IG", sortable: true },
              { key: "status", label: "Status" },
              { key: "atualizado", label: "Atualizado" },
            ].map((col) => (
              <th
                key={col.key}
                className="ce-kicker"
                style={{
                  padding: "0.65rem 0.75rem",
                  textAlign: "left",
                  fontSize: "0.65rem",
                  cursor: col.sortable ? "pointer" : undefined,
                  userSelect: col.sortable ? "none" : undefined,
                  color: col.sortable ? "var(--primary)" : undefined,
                }}
                title={
                  col.key === "janela"
                    ? "Clique para ordenar. Ativas na janela de 24h aparecem primeiro; nova DM do seguidor reinicia a contagem."
                    : undefined
                }
                onClick={col.sortable ? onToggleWindowSort : undefined}
                aria-sort={col.sortable ? (windowSort === "asc" ? "ascending" : "descending") : undefined}
              >
                {col.key === "sel" ? (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll(e.target.checked)}
                    aria-label="Selecionar todos"
                  />
                ) : col.sortable ? (
                  <>
                    {col.label} {windowSort === "asc" ? "↑" : "↓"}
                  </>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const urgent =
              row.windowHoursRemaining != null &&
              row.windowHoursRemaining > 0 &&
              row.windowHoursRemaining < 2
            const expired = row.windowHoursRemaining === 0
            const isPending = row.status === "pending_review"
            const saving = savingIds.has(row.id)
            const textValue = draftTexts[row.id] ?? defaultFinalText(row)
            const selectValue = selectValues[row.id] ?? "pending_review"
            const rowError = rowErrors[row.id]

            return (
              <tr
                key={row.id}
                style={{
                  borderBottom: `1px solid ${tk.border}`,
                  background: urgent
                    ? "color-mix(in oklch, var(--warning) 10%, transparent)"
                    : undefined,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <td style={{ padding: "0.65rem 0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => onToggle(row.id)}
                    disabled={saving}
                    aria-label={`Selecionar ${row.id}`}
                  />
                </td>
                <td style={{ padding: "0.65rem 0.75rem", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                  {row.id}
                </td>
                <td style={{ padding: "0.65rem 0.75rem", fontSize: "var(--text-sm)" }}>
                  @{row.senderUsername ?? "—"}
                </td>
                <td
                  style={{
                    padding: "0.65rem 0.75rem",
                    fontSize: "var(--text-xs)",
                    color: tk.muted,
                    maxWidth: 220,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
                    <Button
                      variant="ghost"
                      onClick={() => onOpenHistorico(row)}
                      aria-label={`Ver histórico da conversa ${row.id}`}
                      title="Ver histórico completo"
                      style={{ padding: "0.2rem", flexShrink: 0, marginTop: 2 }}
                    >
                      <MessageSquareText size={14} />
                    </Button>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {clip(row.clientContextPreview, 200)}
                    </span>
                  </div>
                </td>
                <td
                  style={{
                    padding: "0.65rem 0.75rem",
                    fontSize: "var(--text-xs)",
                    maxWidth: 180,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {clip(row.draftText)}
                </td>
                <td style={{ padding: "0.65rem 0.75rem", minWidth: 200, maxWidth: 280 }}>
                  {isPending ? (
                    <Textarea
                      value={textValue}
                      onChange={(e) => onFinalTextChange(row.id, e.target.value)}
                      onFocus={() => onRowFocus(row.id)}
                      onBlur={() => onRowBlur(row.id)}
                      disabled={saving}
                      rows={3}
                      style={{ minHeight: "4rem", whiteSpace: "pre-wrap", fontSize: "var(--text-xs)" }}
                    />
                  ) : (
                    <span style={{ fontSize: "var(--text-xs)", whiteSpace: "pre-wrap" }}>
                      {clip(row.finalText)}
                    </span>
                  )}
                </td>
                <td style={{ padding: "0.65rem 0.75rem", fontSize: "var(--text-xs)" }}>{row.stage ?? "—"}</td>
                <td style={{ padding: "0.65rem 0.75rem", fontSize: "var(--text-xs)" }}>
                  {formatCuradoriaDateTime(row.lastInboundAt)}
                </td>
                <td
                  style={{
                    padding: "0.65rem 0.75rem",
                    fontSize: "var(--text-xs)",
                    fontWeight: urgent || expired ? 700 : 400,
                    color: expired ? "var(--danger)" : urgent ? "var(--warning)" : tk.muted,
                  }}
                  title="Baseado na última mensagem inbound do seguidor"
                >
                  {formatWindowHours(row.windowHoursRemaining)}
                </td>
                <td style={{ padding: "0.65rem 0.75rem", minWidth: 130 }}>
                  {isPending ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <Select
                        value={selectValue}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === "approved" || v === "rejected") {
                            onStatusChange(row.id, v)
                          }
                        }}
                        onFocus={() => onRowFocus(row.id)}
                        onBlur={() => onRowBlur(row.id)}
                        disabled={saving}
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        {ROW_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      {saving && (
                        <span style={{ fontSize: "0.65rem", color: tk.muted }}>Salvando…</span>
                      )}
                      {rowError && (
                        <span className="ce-error" style={{ fontSize: "0.65rem" }} role="alert">
                          {rowError}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: "var(--text-xs)" }}>{row.status}</span>
                  )}
                </td>
                <td style={{ padding: "0.65rem 0.75rem", fontSize: "var(--text-xs)" }}>
                  {formatCuradoriaDateTime(row.updatedAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
