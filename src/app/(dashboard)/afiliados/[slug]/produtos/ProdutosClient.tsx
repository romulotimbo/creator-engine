"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiUrl } from "@/lib/api-url"
import { PLATAFORMA_AFILIADO_LABELS, STATUS_PRODUTO_LABELS } from "@/lib/afiliados"
import { formatCurrency } from "@/lib/utils"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type Produto = {
  id: string
  slug: string
  nome: string
  plataformaAfil: string
  preco: number | null
  comissaoPercent: number | null
  status: string
}

type Vinculo = {
  id: string
  produtoId: string
  linkTracking: string | null
  ativo: boolean
  produto: Produto
}

export default function ProdutosHubClient({
  slug,
  vinculos: initial,
  catalogo,
}: {
  slug: string
  vinculos: Vinculo[]
  catalogo: Produto[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Vinculo | null>(null)
  const [produtoId, setProdutoId] = useState("")
  const [linkTracking, setLink] = useState("")
  const [ativo, setAtivo] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const associados = useMemo(() => new Set(initial.map((v) => v.produtoId)), [initial])
  const disponiveis = catalogo.filter((p) => !associados.has(p.id))

  function openAssoc() {
    setEdit(null)
    setProdutoId(disponiveis[0]?.id || "")
    setLink("")
    setAtivo(true)
    setError(null)
    setOpen(true)
  }

  function openEdit(v: Vinculo) {
    setEdit(v)
    setProdutoId(v.produtoId)
    setLink(v.linkTracking || "")
    setAtivo(v.ativo)
    setError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (edit) {
        const res = await fetch(apiUrl(`/api/afiliados/${slug}/produtos/${edit.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkTracking: linkTracking || null, ativo }),
        })
        const b = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha")
      } else {
        const res = await fetch(apiUrl(`/api/afiliados/${slug}/produtos`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produtoId, linkTracking: linkTracking || null, ativo }),
        })
        const b = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha")
      }
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  async function remove(v: Vinculo) {
    if (!confirm(`Desassociar ${v.produto.nome}?`)) return
    const res = await fetch(apiUrl(`/api/afiliados/${slug}/produtos/${v.id}`), { method: "DELETE" })
    if (res.ok) router.refresh()
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
        <Link href="/afiliados/produtos">
          <Button variant="ghost">Catálogo</Button>
        </Link>
        <Button onClick={openAssoc} disabled={disponiveis.length === 0}>+ Associar produto</Button>
      </div>

      {initial.length === 0 ? (
        <EmptyState>
          <p>Nenhum produto nesta conta. Associe do catálogo ou crie em Catálogo.</p>
        </EmptyState>
      ) : (
        <Surface className="ce-data-table">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Produto", "Plataforma", "Preço", "Tracking", "Ativo", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--faint)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initial.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px" }}>{v.produto.nome}</td>
                  <td style={{ padding: "10px 12px" }}>{PLATAFORMA_AFILIADO_LABELS[v.produto.plataformaAfil]}</td>
                  <td style={{ padding: "10px 12px" }}>{v.produto.preco != null ? formatCurrency(v.produto.preco) : "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.linkTracking || "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>{v.ativo ? "Sim" : "Não"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <Button variant="ghost" onClick={() => openEdit(v)}>Editar</Button>
                    <Button variant="ghost" onClick={() => remove(v)}>Remover</Button>
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
            <ModalHeader title={edit ? "Editar vínculo" : "Associar produto"} onClose={() => setOpen(false)} />
            {!edit && (
              <Field label="Produto">
                <Select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} required>
                  {disponiveis.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} ({STATUS_PRODUTO_LABELS[p.status]})</option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Link de tracking (desta conta)">
              <Input value={linkTracking} onChange={(e) => setLink(e.target.value)} />
            </Field>
            <Field label="Ativo">
              <Select value={ativo ? "1" : "0"} onChange={(e) => setAtivo(e.target.value === "1")}>
                <option value="1">Sim</option>
                <option value="0">Não</option>
              </Select>
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
