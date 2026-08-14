"use client"

import { useEffect, useState } from "react"
import { Modal, ModalHeader, Field, Input, FormActions, FormError, Button } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"

function currentPeriodoLocal() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(now)
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}`
}

export function ModalPortfolioConfig({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [periodo, setPeriodo] = useState(currentPeriodoLocal())
  const [totalAvailableCapital, setTotalAvailableCapital] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [limitePct, setLimitePct] = useState("")
  const [reservaPct, setReservaPct] = useState("0")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch(apiUrl("/api/afiliados/orcamento"))
      .then((res) => res.json())
      .then((data) => {
        setPeriodo(data.periodo || currentPeriodoLocal())
        setTotalAvailableCapital(data.capitalTotalDisponivel ? String(data.capitalTotalDisponivel) : "")
        setCurrency(data.moedaBase || "USD")
        setLimitePct(data.limitePctPorProduto != null ? String(data.limitePctPorProduto) : "")
        setReservaPct(data.reservaMinimaPct != null ? String(data.reservaMinimaPct) : "0")
      })
      .catch(() => {})
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(apiUrl("/api/afiliados/orcamento"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodo,
          capitalTotalDisponivel: totalAvailableCapital ? parseFloat(totalAvailableCapital) : 0,
          moedaBase: currency,
          limitePctPorProduto: limitePct === "" ? null : parseFloat(limitePct),
          reservaMinimaPct: reservaPct ? parseFloat(reservaPct) : 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar orçamento")
      onSuccess()
    } catch (err: unknown) {
      setError((err as Error).message || "Erro ao salvar orçamento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="24rem">
      <ModalHeader title="Orçamento do período" onClose={onClose} />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Período (YYYY-MM)">
          <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="2026-08" required />
        </Field>
        <Field label="Capital total disponível">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={totalAvailableCapital}
            onChange={(e) => setTotalAvailableCapital(e.target.value)}
            placeholder="5000.00"
          />
        </Field>
        <Field label="Moeda base">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="USD" />
        </Field>
        <Field label="Teto % por produto (opcional)">
          <Input type="number" min="0" max="100" step="0.1" value={limitePct} onChange={(e) => setLimitePct(e.target.value)} placeholder="30" />
        </Field>
        <Field label="Reserva mínima %">
          <Input type="number" min="0" max="100" step="0.1" value={reservaPct} onChange={(e) => setReservaPct(e.target.value)} />
        </Field>

        {error && <FormError>{error}</FormError>}

        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </FormActions>
      </form>
    </Modal>
  )
}
