"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { slugify, formatCurrency } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import { PLATAFORMA_AFILIADO_LABELS, STATUS_PRODUTO_LABELS } from "@/lib/afiliados"
import {
  PageHeader, Button, Input, Textarea, Select, Field, Modal, ModalHeader,
  FormError, FormActions, Surface, EmptyState,
} from "@/components/ui/primitives"

type Produto = {
  id: string
  slug: string
  nome: string
  plataformaAfil: string
  preco: number | null
  comissaoPercent: number | null
  linkCheckout: string | null
  linkLanding: string | null
  status: string
  observacoes: string | null
  _count?: { contas: number; vendas: number }
}

export default function CatalogoProdutosClient({ produtos: initial }: { produtos: Produto[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [plataformaAfil, setPlat] = useState("BRAIP")
  const [preco, setPreco] = useState("")
  const [comissaoPercent, setComissao] = useState("")
  const [linkCheckout, setCheckout] = useState("")
  const [linkLanding, setLanding] = useState("")
  const [status, setStatus] = useState("ATIVO")
  const [observacoes, setObs] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNew() {
    setEditId(null)
    setNome("")
    setSlug("")
    setSlugTouched(false)
    setPlat("BRAIP")
    setPreco("")
    setComissao("")
    setCheckout("")
    setLanding("")
    setStatus("ATIVO")
    setObs("")
    setError(null)
    setOpen(true)
  }

  function openEdit(p: Produto) {
    setEditId(p.id)
    setNome(p.nome)
    setSlug(p.slug)
    setSlugTouched(true)
    setPlat(p.plataformaAfil)
    setPreco(p.preco != null ? String(p.preco) : "")
    setComissao(p.comissaoPercent != null ? String(p.comissaoPercent) : "")
    setCheckout(p.linkCheckout || "")
    setLanding(p.linkLanding || "")
    setStatus(p.status)
    setObs(p.observacoes || "")
    setError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        nome,
        slug,
        plataformaAfil,
        preco: preco === "" ? null : Number(preco),
        comissaoPercent: comissaoPercent === "" ? null : Number(comissaoPercent),
        linkCheckout: linkCheckout || null,
        linkLanding: linkLanding || null,
        status,
        observacoes: observacoes || null,
      }
      const res = await fetch(
        editId ? apiUrl(`/api/produtos-afiliados/${editId}`) : apiUrl("/api/produtos-afiliados"),
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

  async function remove(p: Produto) {
    if (!confirm(`Excluir produto ${p.nome}? Vínculos e refs em vendas serão afetados.`)) return
    const res = await fetch(apiUrl(`/api/produtos-afiliados/${p.id}`), { method: "DELETE" })
    if (res.ok) router.refresh()
  }

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title="Catálogo de produtos"
        description={`${initial.length} oferta(s) afiliadas`}
        actions={
          <>
            <Link href="/afiliados"><Button variant="ghost">Contas de tráfego</Button></Link>
            <Button onClick={openNew}>+ Produto</Button>
          </>
        }
      />

      {initial.length === 0 ? (
        <EmptyState>
          <p>Nenhum produto no catálogo.</p>
        </EmptyState>
      ) : (
        <Surface className="ce-data-table ce-animate-in">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Nome", "Plataforma", "Preço", "Comissão %", "Status", "Contas", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--faint)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initial.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div>{p.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--faint)" }}>{p.slug}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{PLATAFORMA_AFILIADO_LABELS[p.plataformaAfil]}</td>
                  <td style={{ padding: "10px 12px" }}>{p.preco != null ? formatCurrency(p.preco) : "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{p.comissaoPercent != null ? `${p.comissaoPercent}%` : "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{STATUS_PRODUTO_LABELS[p.status]}</td>
                  <td style={{ padding: "10px 12px" }}>{p._count?.contas ?? 0}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <Button variant="ghost" onClick={() => openEdit(p)}>Editar</Button>
                    <Button variant="ghost" onClick={() => remove(p)}>Excluir</Button>
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
            <ModalHeader title={editId ? "Editar produto" : "Novo produto"} onClose={() => setOpen(false)} />
            <Field label="Nome">
              <Input
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (!slugTouched) setSlug(slugify(e.target.value))
                }}
                required
              />
            </Field>
            <Field label="Slug">
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                required
              />
            </Field>
            <Field label="Plataforma afiliada">
              <Select value={plataformaAfil} onChange={(e) => setPlat(e.target.value)}>
                {Object.entries(PLATAFORMA_AFILIADO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Preço">
              <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </Field>
            <Field label="Comissão %">
              <Input type="number" step="0.01" value={comissaoPercent} onChange={(e) => setComissao(e.target.value)} />
            </Field>
            <Field label="Link checkout">
              <Input value={linkCheckout} onChange={(e) => setCheckout(e.target.value)} />
            </Field>
            <Field label="Link LP">
              <Input value={linkLanding} onChange={(e) => setLanding(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS_PRODUTO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Observações">
              <Textarea value={observacoes} onChange={(e) => setObs(e.target.value)} rows={2} />
            </Field>
            {error && <FormError>{error}</FormError>}
            <FormActions>
              <Button type="submit" disabled={saving}>{saving ? "…" : "Salvar"}</Button>
            </FormActions>
          </form>
        </Modal>
      )}
    </div>
  )
}
