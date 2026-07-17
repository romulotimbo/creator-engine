"use client"

import { useEffect, useState } from "react"
import type { CuradoriaDmRow, CuradoriaHistoricoResult } from "@/lib/curadoria-dms-shared"
import { formatCuradoriaDateTime } from "@/lib/curadoria-dms-shared"
import {
  filterRenderableHistoricoMessages,
  getHistoricoMessagePresentation,
} from "@/lib/curadoria-dms-history-view"
import { apiUrl } from "@/lib/api-url"
import {
  EmptyState,
  FormError,
  Modal,
  ModalHeader,
} from "@/components/ui/primitives"
import { tk } from "@/lib/tokens"

type Props = {
  row: CuradoriaDmRow | null
  open: boolean
  onClose: () => void
}

export default function CuradoriaDmHistoricoModal({ row, open, onClose }: Props) {
  const [data, setData] = useState<CuradoriaHistoricoResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !row) {
      setData(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(apiUrl(`/api/curadoria-dms/${row.id}/historico`))
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : "Falha ao carregar histórico.",
          )
        }
        if (!cancelled) setData(body as CuradoriaHistoricoResult)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar histórico.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, row])

  if (!row) return null

  const username = row.senderUsername ?? data?.senderUsername ?? "—"
  const messages = filterRenderableHistoricoMessages(data?.messages ?? [])

  return (
    <Modal open={open} onClose={onClose} maxWidth="42rem">
      <ModalHeader
        title={`Histórico — #${row.id} @${username}`}
        onClose={onClose}
      />
      <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
        {loading && <EmptyState>Carregando mensagens…</EmptyState>}
        {error && <FormError>{error}</FormError>}
        {!loading && !error && data && messages.length === 0 && (
          <EmptyState>Nenhuma mensagem registrada para esta conversa.</EmptyState>
        )}
        {!loading && !error && data && messages.length > 0 && (
          <>
            {data.truncated && (
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--warning)",
                  marginBottom: "0.75rem",
                }}
              >
                Exibindo as {messages.length} mensagens mais recentes (conversa truncada).
              </p>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
                maxHeight: "28rem",
                overflowY: "auto",
                paddingRight: "0.25rem",
              }}
            >
              {messages.map((msg) => {
                const presentation = getHistoricoMessagePresentation(msg.direction)
                if (!presentation) return null

                const { incoming, alignment, label } = presentation
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: alignment,
                      maxWidth: "85%",
                      alignSelf: alignment,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.55rem 0.75rem",
                        borderRadius: "var(--radius)",
                        background: incoming
                          ? "color-mix(in oklch, var(--card) 90%, transparent)"
                          : "color-mix(in oklch, var(--primary) 18%, transparent)",
                        border: `1px solid ${tk.border}`,
                        whiteSpace: "pre-wrap",
                        fontSize: "var(--text-sm)",
                        lineHeight: 1.45,
                      }}
                    >
                      {msg.messageText?.trim() || (
                        <span style={{ color: tk.muted, fontStyle: "italic" }}>
                          (sem texto)
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: tk.muted,
                        marginTop: 4,
                      }}
                    >
                      {label} · {formatCuradoriaDateTime(msg.sentAt)}
                      {msg.senderUsername ? ` · @${msg.senderUsername}` : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
