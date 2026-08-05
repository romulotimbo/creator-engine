import { describe, it, expect } from "vitest"
import { isReviewDue } from "./review"

describe("isReviewDue", () => {
  it("retorna true quando approvalStatus é pending, independente de nextReviewAt", () => {
    expect(isReviewDue({ approvalStatus: "pending", nextReviewAt: "2026-12-01" }, "2026-08-05")).toBe(true)
    expect(isReviewDue({ approvalStatus: "pending", nextReviewAt: null }, "2026-08-05")).toBe(true)
  })

  it("retorna true quando nextReviewAt já venceu", () => {
    expect(isReviewDue({ approvalStatus: "aprovado", nextReviewAt: "2026-07-01" }, "2026-08-05")).toBe(true)
  })

  it("retorna false quando nextReviewAt está no futuro", () => {
    expect(isReviewDue({ approvalStatus: "aprovado", nextReviewAt: "2026-12-01" }, "2026-08-05")).toBe(false)
  })

  it("retorna true quando nextReviewAt é o mesmo dia (condição <=)", () => {
    expect(isReviewDue({ approvalStatus: "aprovado", nextReviewAt: "2026-08-05" }, "2026-08-05")).toBe(true)
  })

  it("retorna false quando nextReviewAt é null e não está pending", () => {
    expect(isReviewDue({ approvalStatus: "aprovado", nextReviewAt: null }, "2026-08-05")).toBe(false)
  })

  it("aceita nextReviewAt como Date", () => {
    expect(isReviewDue({ approvalStatus: "aprovado", nextReviewAt: new Date("2026-07-01T00:00:00Z") }, "2026-08-05")).toBe(true)
    expect(isReviewDue({ approvalStatus: "aprovado", nextReviewAt: new Date("2026-12-01T00:00:00Z") }, "2026-08-05")).toBe(false)
  })
})
