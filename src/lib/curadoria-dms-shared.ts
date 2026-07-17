import { z } from "zod"
import { formatInTimeZone } from "date-fns-tz"
import { ptBR } from "date-fns/locale"

export const CURADORIA_STATUS_VALUES = [
  "pending_review",
  "approved",
  "rejected",
  "sent",
  "failed",
  "skipped",
  "window_expired",
] as const

export const CURADORIA_WINDOW_SORT_VALUES = ["asc", "desc"] as const
export type CuradoriaWindowSort = (typeof CURADORIA_WINDOW_SORT_VALUES)[number]

export const CURADORIA_MESSAGE_DIRECTION_VALUES = ["incoming", "outgoing"] as const
export type CuradoriaMessageDirection =
  (typeof CURADORIA_MESSAGE_DIRECTION_VALUES)[number]

export function isCuradoriaMessageDirection(
  value: unknown,
): value is CuradoriaMessageDirection {
  return (
    typeof value === "string" &&
    CURADORIA_MESSAGE_DIRECTION_VALUES.includes(value as CuradoriaMessageDirection)
  )
}

export function parseCuradoriaWindowSort(value: string | null | undefined): CuradoriaWindowSort {
  return value === "desc" ? "desc" : "asc"
}

export const CURADORIA_DECISION_VALUES = ["approved", "rejected"] as const
export type CuradoriaDecision = (typeof CURADORIA_DECISION_VALUES)[number]

export type CuradoriaDmRow = {
  id: number
  conversationId: string
  inboundMessageId: string | null
  senderUsername: string | null
  clientContextPreview: string | null
  draftText: string | null
  finalText: string | null
  stage: string | null
  lastInboundAt: string | null
  windowHoursRemaining: number | null
  status: string
  createdAt: string
  updatedAt: string
}

export type CuradoriaListResult = {
  items: CuradoriaDmRow[]
  total: number
  page: number
  limit: number
}

export type CuradoriaDmMessage = {
  id: number
  direction: CuradoriaMessageDirection
  messageText: string | null
  sentAt: string
  senderUsername: string | null
}

export type CuradoriaHistoricoResult = {
  conversationId: string
  senderUsername: string | null
  messages: CuradoriaDmMessage[]
  truncated: boolean
}

export type CuradoriaMessageDbRow = {
  id: number | string
  direction: string | null
  message_text: string | null
  sent_at: Date | string
  sender_username: string | null
}

export type CuradoriaErrorCode = "STALE_VERSION" | "NOT_PENDING" | "NOT_FOUND"

export class CuradoriaDmError extends Error {
  constructor(
    message: string,
    public code: CuradoriaErrorCode,
    public httpStatus: number,
  ) {
    super(message)
    this.name = "CuradoriaDmError"
  }
}

export const patchCuradoriaSchema = z.object({
  finalText: z.string().optional(),
  status: z.enum(CURADORIA_DECISION_VALUES),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
})

export const batchCuradoriaItemSchema = z.object({
  id: z.coerce.number().int().positive(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  finalText: z.string().optional(),
})

export const batchCuradoriaSchema = z.object({
  action: z.enum(CURADORIA_DECISION_VALUES),
  items: z.array(batchCuradoriaItemSchema).min(1).max(50),
})

export type PatchCuradoriaInput = z.infer<typeof patchCuradoriaSchema>
export type BatchCuradoriaInput = z.infer<typeof batchCuradoriaSchema>

export type BatchCuradoriaResult = {
  succeeded: CuradoriaDmRow[]
  failed: Array<{ id: number; code: CuradoriaErrorCode; message: string }>
}

export type CuradoriaDbRow = {
  id: number | string
  conversation_id: string
  inbound_message_id: string | null
  sender_username: string | null
  client_context_preview: string | null
  draft_text: string | null
  final_text: string | null
  stage: string | null
  last_inbound_at: Date | string | null
  window_hours_remaining: number | string | null
  status: string
  created_at: Date | string
  updated_at: Date | string
}

function toIso(value: Date | string | null): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export const CURADORIA_HISTORICO_MAX_MESSAGES = 500

export function mapHistoricoMessage(row: CuradoriaMessageDbRow): CuradoriaDmMessage | null {
  if (!isCuradoriaMessageDirection(row.direction)) return null

  return {
    id: Number(row.id),
    direction: row.direction,
    messageText: row.message_text,
    sentAt: toIso(row.sent_at)!,
    senderUsername: row.sender_username,
  }
}

function parseWindowHours(value: number | string | null): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatWindowHours(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—"
  if (hours === 0) return "Expirada"
  return `${hours.toFixed(1)}h`
}

export function mapCuradoriaRow(row: CuradoriaDbRow): CuradoriaDmRow {
  return {
    id: Number(row.id),
    conversationId: row.conversation_id,
    inboundMessageId: row.inbound_message_id,
    senderUsername: row.sender_username,
    clientContextPreview: row.client_context_preview,
    draftText: row.draft_text,
    finalText: row.final_text,
    stage: row.stage,
    lastInboundAt: toIso(row.last_inbound_at),
    windowHoursRemaining: parseWindowHours(row.window_hours_remaining),
    status: row.status,
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
  }
}

export function curadoriaErrorToHttp(
  code: CuradoriaErrorCode,
): { status: number; body: { error: string; code: CuradoriaErrorCode } } {
  if (code === "NOT_FOUND") {
    return { status: 404, body: { error: "Registro não encontrado", code } }
  }
  if (code === "NOT_PENDING") {
    return {
      status: 409,
      body: { error: "Registro não está em pending_review", code },
    }
  }
  return {
    status: 409,
    body: { error: "Registro alterado por outro operador. Recarregue e tente novamente.", code },
  }
}

export function formatCuradoriaDateTime(iso: string | null): string {
  if (!iso) return "—"
  return formatInTimeZone(iso, "America/Sao_Paulo", "dd/MM/yyyy HH:mm", { locale: ptBR })
}
