"use client"

import { useEffect, useState } from "react"
import { Modal, ModalHeader, Field, Input, FormActions, FormError, Button } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"

export function ModalPortfolioConfig({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [totalAvailableCapital, setTotalAvailableCapital] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch(apiUrl("/api/afiliados/portfolio-config"))
      .then((res) => res.json())
      .then((data) => {
        setTotalAvailableCapital(data.totalAvailableCapital ? String(data.totalAvailableCapital) : "")
        setCurrency(data.currency || "USD")
      })
      .catch(() => {})
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(apiUrl("/api/afiliados/portfolio-config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAvailableCapital: totalAvailableCapital ? parseFloat(totalAvailableCapital) : 0,
          currency,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar configuração")
      onSuccess()
    } catch (err: unknown) {
      setError((err as Error).message || "Erro ao salvar configuração")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="24rem">
      <ModalHeader title="Configurar Capital do Portfólio" onClose={onClose} />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Capital Total Disponível">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={totalAvailableCapital}
            onChange={(e) => setTotalAvailableCapital(e.target.value)}
            placeholder="5000.00"
          />
        </Field>
        <Field label="Moeda">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="USD" />
        </Field>

        {error && <FormError>{error}</FormError>}

        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </FormActions>
      </form>
    </Modal>
  )
}
