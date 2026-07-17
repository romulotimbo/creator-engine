import "server-only"

import {
  type BatchCuradoriaInput,
  type BatchCuradoriaResult,
  CURADORIA_HISTORICO_MAX_MESSAGES,
  type CuradoriaDbRow,
  type CuradoriaDmRow,
  CuradoriaDmError,
  type CuradoriaHistoricoResult,
  type CuradoriaListResult,
  type CuradoriaMessageDbRow,
  type CuradoriaWindowSort,
  type PatchCuradoriaInput,
  curadoriaErrorToHttp,
  mapCuradoriaRow,
  mapHistoricoMessage,
  parseCuradoriaWindowSort,
} from "@/lib/curadoria-dms-shared"
import {
  CURADORIA_HISTORICO_COUNT_SQL,
  CURADORIA_HISTORICO_MESSAGES_SQL,
} from "@/lib/curadoria-dms-history-query"
import { isN8nPostgresConfigured, queryN8n, queryN8nOne } from "@/lib/n8n-postgres"

export { isN8nPostgresConfigured }
export {
  batchCuradoriaSchema,
  patchCuradoriaSchema,
  CuradoriaDmError,
} from "@/lib/curadoria-dms-shared"

const INBOUND_LATERAL = `
LEFT JOIN LATERAL (
  SELECT MAX(COALESCE(msg.sent_at, msg.created_at)) AS latest_inbound
  FROM instagram_dm_messages msg
  WHERE msg.conversation_id = r.conversation_id
    AND msg.direction = 'incoming'
) inbound ON true`

const EFFECTIVE_LAST_INBOUND = `COALESCE(inbound.latest_inbound, r.last_inbound_at)`

const WINDOW_HOURS_EXPR = (inboundExpr: string) => `CASE
  WHEN (${inboundExpr}) IS NULL THEN NULL
  ELSE GREATEST(
    0,
    ROUND(
      (24 - EXTRACT(EPOCH FROM (NOW() - (${inboundExpr}))) / 3600)::numeric,
      1
    )
  )
END`

const SELECT_FIELDS = `
  r.id,
  r.conversation_id,
  r.inbound_message_id,
  r.sender_username,
  r.client_context_preview,
  r.draft_text,
  r.final_text,
  r.context_json->>'stage' AS stage,
  ${EFFECTIVE_LAST_INBOUND} AS last_inbound_at,
  ${WINDOW_HOURS_EXPR(EFFECTIVE_LAST_INBOUND)} AS window_hours_remaining,
  r.status,
  r.created_at,
  r.updated_at
`

const EFFECTIVE_LAST_INBOUND_RETURNING = `COALESCE(
  (
    SELECT MAX(COALESCE(m.sent_at, m.created_at))
    FROM instagram_dm_messages m
    WHERE m.conversation_id = instagram_dm_responses.conversation_id
      AND m.direction = 'incoming'
  ),
  last_inbound_at
)`

const RETURNING_FIELDS = `
  id,
  conversation_id,
  inbound_message_id,
  sender_username,
  client_context_preview,
  draft_text,
  final_text,
  context_json->>'stage' AS stage,
  ${EFFECTIVE_LAST_INBOUND_RETURNING} AS last_inbound_at,
  ${WINDOW_HOURS_EXPR(EFFECTIVE_LAST_INBOUND_RETURNING)} AS window_hours_remaining,
  status,
  created_at,
  updated_at
`

function assertN8nPostgresConfigured(): void {
  if (!isN8nPostgresConfigured()) {
    const err = new Error("Conexão n8n não configurada (N8N_POSTGRES_URL)")
    err.name = "N8nPostgresNotConfiguredError"
    throw err
  }
}

export type ListCuradoriaParams = {
  status?: string
  username?: string
  q?: string
  page?: number
  limit?: number
  sortWindow?: CuradoriaWindowSort
}

function buildWindowOrderBy(sortWindow: CuradoriaWindowSort): string {
  const windowDir = sortWindow === "desc" ? "DESC" : "ASC"
  return `CASE
    WHEN window_hours_remaining > 0 THEN 0
    WHEN window_hours_remaining = 0 THEN 1
    ELSE 2
  END ASC,
  window_hours_remaining ${windowDir} NULLS LAST,
  last_inbound_at DESC NULLS LAST,
  created_at DESC`
}

export async function listCuradoriaDms(
  params: ListCuradoriaParams = {},
): Promise<CuradoriaListResult> {
  assertN8nPostgresConfigured()

  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 25))
  const offset = (page - 1) * limit
  const sortWindow = parseCuradoriaWindowSort(params.sortWindow)

  const status = params.status?.trim() || "pending_review"
  const username = params.username?.trim()
  const q = params.q?.trim()

  const conditions: string[] = ["r.status = $1"]
  const values: unknown[] = [status]
  let idx = 2

  if (username) {
    conditions.push(`r.sender_username ILIKE $${idx}`)
    values.push(`%${username}%`)
    idx++
  }

  if (q) {
    conditions.push(
      `(r.client_context_preview ILIKE $${idx} OR r.draft_text ILIKE $${idx})`,
    )
    values.push(`%${q}%`)
    idx++
  }

  const where = conditions.join(" AND ")

  const countRow = await queryN8nOne<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM instagram_dm_responses r WHERE ${where}`,
    values,
  )
  const total = Number(countRow?.total ?? 0)

  const rows = await queryN8n<CuradoriaDbRow>(
    `SELECT * FROM (
       SELECT ${SELECT_FIELDS}
       FROM instagram_dm_responses r
       ${INBOUND_LATERAL}
       WHERE ${where}
     ) curated
     ORDER BY ${buildWindowOrderBy(sortWindow)}
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset],
  )

  return {
    items: rows.map(mapCuradoriaRow),
    total,
    page,
    limit,
  }
}

export async function getCuradoriaHistorico(
  id: number,
): Promise<CuradoriaHistoricoResult | null> {
  assertN8nPostgresConfigured()

  const response = await queryN8nOne<{
    conversation_id: string
    sender_username: string | null
  }>(
    `SELECT conversation_id, sender_username
     FROM instagram_dm_responses
     WHERE id = $1`,
    [id],
  )

  if (!response) return null

  const countRow = await queryN8nOne<{ total: string }>(
    CURADORIA_HISTORICO_COUNT_SQL,
    [response.conversation_id],
  )
  const total = Number(countRow?.total ?? 0)

  const rows = await queryN8n<CuradoriaMessageDbRow>(
    CURADORIA_HISTORICO_MESSAGES_SQL,
    [response.conversation_id, CURADORIA_HISTORICO_MAX_MESSAGES],
  )
  const messages = rows
    .map(mapHistoricoMessage)
    .filter((message): message is NonNullable<typeof message> => message !== null)

  return {
    conversationId: response.conversation_id,
    senderUsername: response.sender_username,
    messages,
    truncated: total > CURADORIA_HISTORICO_MAX_MESSAGES,
  }
}

export async function getCuradoriaDmById(id: number): Promise<CuradoriaDmRow | null> {
  assertN8nPostgresConfigured()

  const row = await queryN8nOne<CuradoriaDbRow>(
    `SELECT ${SELECT_FIELDS}
     FROM instagram_dm_responses r
     ${INBOUND_LATERAL}
     WHERE r.id = $1`,
    [id],
  )

  return row ? mapCuradoriaRow(row) : null
}

async function resolveUpdateConflict(id: number) {
  const current = await queryN8nOne<{ status: string }>(
    `SELECT status FROM instagram_dm_responses WHERE id = $1`,
    [id],
  )
  if (!current) return "NOT_FOUND" as const
  if (current.status !== "pending_review") return "NOT_PENDING" as const
  return "STALE_VERSION" as const
}

export async function updateCuradoriaDm(
  id: number,
  input: PatchCuradoriaInput,
): Promise<CuradoriaDmRow> {
  assertN8nPostgresConfigured()

  const finalText = input.finalText ?? ""

  const row = await queryN8nOne<CuradoriaDbRow>(
    `UPDATE instagram_dm_responses
     SET
       final_text = CASE
         WHEN $2 = 'approved'
           THEN COALESCE(NULLIF(BTRIM($3), ''), final_text, draft_text)
         ELSE COALESCE(NULLIF(BTRIM($3), ''), final_text)
       END,
       status = $2,
       reviewed_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
       AND status = 'pending_review'
       AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $4::timestamptz)
     RETURNING ${RETURNING_FIELDS}`,
    [id, input.status, finalText, input.expectedUpdatedAt],
  )

  if (!row) {
    const code = await resolveUpdateConflict(id)
    const http = curadoriaErrorToHttp(code)
    throw new CuradoriaDmError(http.body.error, code, http.status)
  }

  return mapCuradoriaRow(row)
}

export async function batchUpdateCuradoriaDms(
  input: BatchCuradoriaInput,
): Promise<BatchCuradoriaResult> {
  assertN8nPostgresConfigured()

  const succeeded: CuradoriaDmRow[] = []
  const failed: BatchCuradoriaResult["failed"] = []

  for (const item of input.items) {
    try {
      const updated = await updateCuradoriaDm(item.id, {
        status: input.action,
        finalText: item.finalText,
        expectedUpdatedAt: item.expectedUpdatedAt,
      })
      succeeded.push(updated)
    } catch (err) {
      if (err instanceof CuradoriaDmError) {
        failed.push({
          id: item.id,
          code: err.code,
          message: err.message,
        })
      } else {
        throw err
      }
    }
  }

  return { succeeded, failed }
}
