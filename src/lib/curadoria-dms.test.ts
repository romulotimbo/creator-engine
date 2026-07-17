import { describe, expect, it } from "vitest"
import {
  batchCuradoriaSchema,
  curadoriaErrorToHttp,
  CURADORIA_HISTORICO_MAX_MESSAGES,
  formatWindowHours,
  mapCuradoriaRow,
  mapHistoricoMessage,
  parseCuradoriaWindowSort,
  patchCuradoriaSchema,
} from "./curadoria-dms-shared"

describe("patchCuradoriaSchema", () => {
  it("aceita payload válido de aprovação", () => {
    const parsed = patchCuradoriaSchema.parse({
      finalText: " Olá! ",
      status: "approved",
      expectedUpdatedAt: "2026-07-12T17:48:59.233Z",
    })
    expect(parsed.status).toBe("approved")
    expect(parsed.finalText).toBe(" Olá! ")
  })

  it("rejeita status inválido", () => {
    expect(() =>
      patchCuradoriaSchema.parse({
        status: "reject",
        expectedUpdatedAt: "2026-07-12T17:48:59.233Z",
      }),
    ).toThrow()
  })

  it("exige expectedUpdatedAt", () => {
    expect(() =>
      patchCuradoriaSchema.parse({
        status: "rejected",
      }),
    ).toThrow()
  })
})

describe("batchCuradoriaSchema", () => {
  it("aceita até 50 itens", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      expectedUpdatedAt: "2026-07-12T17:48:59.233Z",
    }))
    const parsed = batchCuradoriaSchema.parse({ action: "rejected", items })
    expect(parsed.items).toHaveLength(50)
  })

  it("rejeita lote vazio", () => {
    expect(() =>
      batchCuradoriaSchema.parse({ action: "approved", items: [] }),
    ).toThrow()
  })

  it("rejeita mais de 50 itens", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      id: i + 1,
      expectedUpdatedAt: "2026-07-12T17:48:59.233Z",
    }))
    expect(() =>
      batchCuradoriaSchema.parse({ action: "approved", items }),
    ).toThrow()
  })
})

describe("curadoriaErrorToHttp", () => {
  it("mapeia STALE_VERSION para 409", () => {
    const res = curadoriaErrorToHttp("STALE_VERSION")
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("STALE_VERSION")
  })

  it("mapeia NOT_PENDING para 409", () => {
    const res = curadoriaErrorToHttp("NOT_PENDING")
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("NOT_PENDING")
  })

  it("mapeia NOT_FOUND para 404", () => {
    const res = curadoriaErrorToHttp("NOT_FOUND")
    expect(res.status).toBe(404)
  })
})

describe("mapCuradoriaRow", () => {
  it("converte snake_case e números", () => {
    const row = mapCuradoriaRow({
      id: "7",
      conversation_id: "conv-1",
      inbound_message_id: "in-1",
      sender_username: "fan123",
      client_context_preview: "oi\ncomo vai",
      draft_text: "rascunho",
      final_text: null,
      stage: "warm",
      last_inbound_at: "2026-07-12T20:00:00.000Z",
      window_hours_remaining: "3.5",
      status: "pending_review",
      created_at: "2026-07-12T19:00:00.000Z",
      updated_at: "2026-07-12T19:30:00.000Z",
    })

    expect(row.id).toBe(7)
    expect(row.senderUsername).toBe("fan123")
    expect(row.windowHoursRemaining).toBe(3.5)
    expect(row.clientContextPreview).toBe("oi\ncomo vai")
    expect(row.conversationId).toBe("conv-1")
  })

  it("preserva window_hours_remaining null sem inbound", () => {
    const row = mapCuradoriaRow({
      id: 1,
      conversation_id: "c1",
      inbound_message_id: null,
      sender_username: null,
      client_context_preview: null,
      draft_text: null,
      final_text: null,
      stage: null,
      last_inbound_at: null,
      window_hours_remaining: null,
      status: "pending_review",
      created_at: "2026-07-12T19:00:00.000Z",
      updated_at: "2026-07-12T19:30:00.000Z",
    })

    expect(row.windowHoursRemaining).toBeNull()
    expect(row.lastInboundAt).toBeNull()
  })

  it("converte janela recente para número positivo", () => {
    const row = mapCuradoriaRow({
      id: 2,
      conversation_id: "c2",
      inbound_message_id: null,
      sender_username: "fan",
      client_context_preview: null,
      draft_text: null,
      final_text: null,
      stage: null,
      last_inbound_at: "2026-07-13T12:00:00.000Z",
      window_hours_remaining: "23.5",
      status: "pending_review",
      created_at: "2026-07-12T19:00:00.000Z",
      updated_at: "2026-07-12T19:30:00.000Z",
    })

    expect(row.windowHoursRemaining).toBe(23.5)
  })
})

describe("parseCuradoriaWindowSort", () => {
  it("default asc", () => {
    expect(parseCuradoriaWindowSort(undefined)).toBe("asc")
    expect(parseCuradoriaWindowSort("invalid")).toBe("asc")
  })

  it("aceita desc", () => {
    expect(parseCuradoriaWindowSort("desc")).toBe("desc")
  })
})

describe("formatWindowHours", () => {
  it("exibe traço quando janela é desconhecida", () => {
    expect(formatWindowHours(null)).toBe("—")
  })

  it("exibe Expirada somente quando zero", () => {
    expect(formatWindowHours(0)).toBe("Expirada")
  })

  it("exibe horas quando janela ativa", () => {
    expect(formatWindowHours(23.5)).toBe("23.5h")
    expect(formatWindowHours(0.3)).toBe("0.3h")
  })
})

describe("mapHistoricoMessage", () => {
  it("converte mensagem do histórico", () => {
    const msg = mapHistoricoMessage({
      id: "42",
      direction: "incoming",
      message_text: "olá",
      sent_at: "2026-07-13T12:00:00.000Z",
      sender_username: "fan123",
    })

    expect(msg.id).toBe(42)
    expect(msg.direction).toBe("incoming")
    expect(msg.messageText).toBe("olá")
    expect(msg.sentAt).toBe("2026-07-13T12:00:00.000Z")
    expect(msg.senderUsername).toBe("fan123")
  })

  it("normaliza direction ausente", () => {
    const msg = mapHistoricoMessage({
      id: 1,
      direction: null,
      message_text: null,
      sent_at: "2026-07-13T12:00:00.000Z",
      sender_username: null,
    })

    expect(msg.direction).toBe("unknown")
    expect(msg.messageText).toBeNull()
  })
})

describe("CURADORIA_HISTORICO_MAX_MESSAGES", () => {
  it("define limite de truncamento do histórico", () => {
    expect(CURADORIA_HISTORICO_MAX_MESSAGES).toBe(500)
  })
})
