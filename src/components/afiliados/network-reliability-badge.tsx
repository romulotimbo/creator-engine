"use client"

import { ShieldCheck } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface NetworkReliabilityBadgeProps {
  paymentReliabilityScore: number | null | undefined
  reliabilityUpdatedAt: string | Date | null | undefined
}

/**
 * Badge de confiabilidade de pagamento da rede (network-reliability).
 * Puramente informativo — nunca influencia o score da oferta.
 */
export function NetworkReliabilityBadge({
  paymentReliabilityScore,
  reliabilityUpdatedAt,
}: NetworkReliabilityBadgeProps) {
  const hasScore = paymentReliabilityScore != null

  const color = !hasScore
    ? "var(--muted-foreground)"
    : paymentReliabilityScore! >= 70
      ? "var(--success)"
      : paymentReliabilityScore! >= 40
        ? "var(--warning)"
        : "var(--danger)"

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${color}`,
        fontSize: 11,
        color,
        whiteSpace: "nowrap",
      }}
      title="Confiabilidade de pagamento da rede — não influencia o score da oferta"
    >
      <ShieldCheck size={12} />
      {hasScore ? (
        <span>
          Confiabilidade: <strong>{paymentReliabilityScore}/100</strong>
          {reliabilityUpdatedAt && (
            <span style={{ color: "var(--muted-foreground)" }}> · {formatDate(reliabilityUpdatedAt)}</span>
          )}
        </span>
      ) : (
        <span>Sem avaliação</span>
      )}
    </div>
  )
}
