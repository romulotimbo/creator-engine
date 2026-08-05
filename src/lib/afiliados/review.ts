/**
 * Fila de revisão de ofertas (offer-review-queue).
 *
 * `isReviewDue` é uma função pura, sem I/O — decide se uma oferta precisa
 * de revisão hoje. Não existe coluna derivada no banco (ver design.md,
 * decisão 3): o Radar filtra a listagem em runtime usando esta função.
 *
 * `approvalStatus` não é um campo real de `OfertaDecisao` — é um conceito
 * genérico da spec. No domínio atual, `statusDecisao === "ANALISE"`
 * (oferta aguardando decisão) é o equivalente a "pending"; o chamador é
 * responsável por mapear o campo real para este shape antes de invocar.
 */
export interface ReviewableOffer {
  approvalStatus?: string | null
  nextReviewAt?: Date | string | null
}

function toDateOnlyString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  // já é string — normaliza para os primeiros 10 chars (YYYY-MM-DD) caso venha com hora
  return value.slice(0, 10)
}

export function isReviewDue(offer: ReviewableOffer, today: string): boolean {
  if (offer.approvalStatus === "pending") return true

  if (offer.nextReviewAt == null) return false

  const nextReviewDate = toDateOnlyString(offer.nextReviewAt)
  return nextReviewDate <= today
}
