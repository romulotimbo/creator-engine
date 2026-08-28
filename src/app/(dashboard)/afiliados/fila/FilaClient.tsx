"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api-url"
import { formatDate } from "@/lib/utils"
import {
  TIPO_ALVO_FILA_LABELS,
  PRIORIDADE_FILA_LABELS,
} from "@/lib/afiliados/fila"
import { TIPO_AJUSTE_LABELS } from "@/lib/afiliados/ajustes"
import { Button, Select, Input, Field, Surface, EmptyState, Modal, ModalHeader, FormError, FormActions } from "@/components/ui/primitives"

type Item = {
  id: string
  tipoAlvo: string
  alvoId: string
  alvoLabel: string
  regra: string
  prioridade: string
  resumo: string
  status: string
  evidencia: Record<string, unknown> | null
  createdAt: string
}

const PRIORIDADE_COR: Record<string, string> = {
  ALTA: "var(--destructive)",
  MEDIA: "var(--warning, #d97706)",
  BAIXA: "var(--muted-foreground)",
}

export default function FilaClient({ itens }: { itens: Item[] }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState<Item | null>(null)
  const [comAjuste, setComAjuste] = useState(false)
  const [tipoAjuste, setTipoAjuste] = useState("BUDGET")
  const [valorAnterior, setValorAnterior] = useState("")
  const [valorAplicado, setValorAplicado] = useState("")
  const [motivo, setMotivo] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function abrirConfirmar(item: Item) {
    setConfirmando(item)
    setComAjuste(false)
    setTipoAjuste("BUDGET")
    setValorAnterior("")
    setValorAplicado("")
    setMotivo("")
    setError(null)
  }

  async function acao(item: Item, body: Record<string, unknown>) {
    setSaving(item.id)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/fila/${item.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha")
      setConfirmando(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(null)
    }
  }

  async function confirmarSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmando) return
    await acao(confirmando, {
      acao: "confirmar",
      ...(comAjuste
        ? {
            tipoAjuste,
            valorAnterior: valorAnterior === "" ? null : Number(valorAnterior),
            valorAplicado: valorAplicado === "" ? null : Number(valorAplicado),
            motivo: motivo || null,
          }
        : {}),
    })
  }

  if (itens.length === 0) {
    return (
      <EmptyState>
        <p>Nenhum item aberto na fila. 🎉</p>
      </EmptyState>
    )
  }

  return (
    <>
      {error && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {itens.map((item) => (
          <Surface key={item.id} style={{ padding: "var(--space-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: PRIORIDADE_COR[item.prioridade] || undefined, fontSize: 12 }}>
                    {PRIORIDADE_FILA_LABELS[item.prioridade] || item.prioridade}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {TIPO_ALVO_FILA_LABELS[item.tipoAlvo] || item.tipoAlvo} · {item.regra}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{formatDate(new Date(item.createdAt))}</span>
                </div>
                <p style={{ fontSize: 13, marginBottom: 4 }}>{item.resumo}</p>
                <Link
                  href={item.tipoAlvo === "CAMPANHA" ? `/afiliados/campanhas/${item.alvoId}` : "/afiliados/radar"}
                  className="ce-link-accent"
                  style={{ fontSize: 12 }}
                >
                  {item.alvoLabel} →
                </Link>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Button variant="ghost" disabled={saving === item.id} onClick={() => acao(item, { acao: "adiar" })}>
                  Adiar
                </Button>
                <Button variant="ghost" disabled={saving === item.id} onClick={() => acao(item, { acao: "dispensar" })}>
                  Dispensar
                </Button>
                <Button disabled={saving === item.id} onClick={() => abrirConfirmar(item)}>
                  Confirmar
                </Button>
              </div>
            </div>
          </Surface>
        ))}
      </div>

      {confirmando && (
        <Modal open onClose={() => setConfirmando(null)}>
          <form onSubmit={confirmarSubmit}>
            <ModalHeader title="Confirmar item de fila" onClose={() => setConfirmando(null)} />
            <p style={{ fontSize: 13, marginBottom: 12 }}>{confirmando.resumo}</p>

            <Field label="">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={comAjuste} onChange={(e) => setComAjuste(e.target.checked)} />
                Este item resulta em um ajuste de campanha (registrar AjusteCampanha)
              </label>
            </Field>

            {comAjuste && (
              <>
                <Field label="Tipo de ajuste">
                  <Select value={tipoAjuste} onChange={(e) => setTipoAjuste(e.target.value)}>
                    {Object.entries(TIPO_AJUSTE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Valor anterior (opcional)">
                  <Input type="number" step="0.01" value={valorAnterior} onChange={(e) => setValorAnterior(e.target.value)} />
                </Field>
                <Field label="Valor real aplicado">
                  <Input type="number" step="0.01" value={valorAplicado} onChange={(e) => setValorAplicado(e.target.value)} required />
                </Field>
                <Field label="Motivo (opcional)">
                  <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </Field>
              </>
            )}

            {error && <FormError>{error}</FormError>}
            <FormActions>
              <Button type="submit" disabled={saving === confirmando.id}>
                {saving === confirmando.id ? "…" : "Confirmar"}
              </Button>
            </FormActions>
          </form>
        </Modal>
      )}
    </>
  )
}
