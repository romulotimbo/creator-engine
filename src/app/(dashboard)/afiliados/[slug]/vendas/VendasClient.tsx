"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api-url"
import { PLATAFORMA_AFILIADO_LABELS, STATUS_VENDA_LABELS } from "@/lib/afiliados"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type ProdutoOpt = { id: string; nome: string; plataformaAfil: string }

type Venda = {
  id: string
  data: string
  valorVenda: number
  valorComissao: number
  plataformaAfil: string
  status: string
  produto?: { id: string; nome: string } | null
  observacoes: string | null
}

export default function VendasClient({
  slug,
  contaTrafegoId,
  vendas: initial,
  produtos,
}: {
  slug: string
  contaTrafegoId: string
  vendas: Venda[]
  produtos: ProdutoOpt[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [data, setData] = useState("")
  const [valorVenda, setValorVenda] = useState("")
  const [valorComissao, setValorComissao] = useState("")
  const [plataformaAfil, setPlat] = useState("BRAIP")
  const [status, setStatus] = useState("PENDENTE")
  const [produtoId, setProdutoId] = useState("")
  const [observacoes, setObs] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNew() {
    setEditId(null)
    setData(new Date().toISOString().slice(0, 10))
    setValorVenda("")
    setValorComissao("")
    setPlat(produtos[0]?.plataformaAfil || "BRAIP")
    setStatus("PENDENTE")
    setProdutoId(produtos[0]?.id || "")
    setObs("")
    setError(null)
    setOpen(true)
  }

  function openEdit(v: Venda) {
    setEditId(v.id)
    setData(v.data.slice(0, 10))
    setValorVenda(String(v.valorVenda))
    setValorComissao(String(v.valorComissao))
    setPlat(v.plataformaAfil)
    setStatus(v.status)
    setProdutoId(v.produto?.id || "")
    setObs(v.observacoes || "")
    setError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        contaTrafegoId,
        data,
        valorVenda: Number(valorVenda),
        valorComissao: Number(valorComissao),
        plataformaAfil,
        status,
        produtoId: produtoId || null,
        observacoes: observacoes || null,
      }
      const res = await fetch(
        editId ? apiUrl(`/api/vendas-afiliados/${editId}`) : apiUrl("/api/vendas-afiliados"),
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editId ? { ...payload, contaTrafegoId: undefined } : payload),
        },
      )
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha")
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  async function remove(v: Venda) {
    if (!confirm("Excluir lançamento?")) return
    const res = await fetch(apiUrl(`/api/vendas-afiliados/${v.id}`), { method: "DELETE" })
    if (res.ok) router.refresh()
  }

  async function setStatusQuick(v: Venda, next: string) {
    const res = await fetch(apiUrl(`/api/vendas-afiliados/${v.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button onClick={openNew}>+ Lançar venda</Button>
      </div>

      {initial.length === 0 ? (
        <EmptyState>
          <p>Nenhuma venda. Lançamentos são manuais (automação n8n/webhook depois).</p>
        </EmptyState>
      ) : (
        <Surface className="ce-data-table">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Data", "Produto", "Venda", "Comissão", "Plataforma", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--faint)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initial.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px" }}>{formatDate(new Date(v.data))}</td>
                  <td style={{ padding: "10px 12px" }}>{v.produto?.nome || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{formatCurrency(v.valorVenda)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--success)" }}>{formatCurrency(v.valorComissao)}</td>
                  <td style={{ padding: "10px 12px" }}>{PLATAFORMA_AFILIADO_LABELS[v.plataformaAfil]}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <Select
                      value={v.status}
                      onChange={(e) => setStatusQuick(v, e.target.value)}
                      style={{ fontSize: 12, padding: "2px 6px" }}
                    >
                      {Object.entries(STATUS_VENDA_LABELS).map(([k, lab]) => (
                        <option key={k} value={k}>{lab}</option>
                      ))}
                    </Select>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <Button variant="ghost" onClick={() => openEdit(v)}>Editar</Button>
                    <Button variant="ghost" onClick={() => remove(v)}>Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      )}

      {open && (
        <Modal open={open} onClose={() => setOpen(false)}>
          <form onSubmit={save}>
            <ModalHeader title={editId ? "Editar venda" : "Lançar venda (manual)"} onClose={() => setOpen(false)} />
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </Field>
            <Field label="Produto (opcional)">
              <Select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
                <option value="">—</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </Select>
            </Field>
            <Field label="Valor da venda">
              <Input type="number" step="0.01" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} required />
            </Field>
            <Field label="Comissão">
              <Input type="number" step="0.01" value={valorComissao} onChange={(e) => setValorComissao(e.target.value)} required />
            </Field>
            <Field label="Plataforma afiliada">
              <Select value={plataformaAfil} onChange={(e) => setPlat(e.target.value)}>
                {Object.entries(PLATAFORMA_AFILIADO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS_VENDA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Observações">
              <Input value={observacoes} onChange={(e) => setObs(e.target.value)} />
            </Field>
            {error && <FormError>{error}</FormError>}
            <FormActions>
              <Button type="submit" disabled={saving}>{saving ? "…" : "Salvar"}</Button>
            </FormActions>
          </form>
        </Modal>
      )}
    </>
  )
}
