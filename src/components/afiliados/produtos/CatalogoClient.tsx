"use client"

import { Fragment, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { slugify } from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  PLATAFORMA_AFILIADO_LABELS,
  STATUS_PRODUTO_LABELS,
  STATUS_OPERACIONAL_LABELS,
  CONVERSION_POINT_LABELS,
  TIPO_PRODUTO_AFILIADO_LABELS,
  PAPEL_CONTA_ADS_LABELS,
} from "@/lib/afiliados"
import {
  PageHeader, Button, Input, Textarea, Select, Field, Modal, ModalHeader,
  FormError, FormActions, Surface, EmptyState, Badge,
} from "@/components/ui/primitives"

type CampanhaResumo = {
  id: string
  nomeContaAds: string | null
  nomeCampanhaGoogleAds: string
  geo: string | null
  papelConta: string
  status: string
  alertaOrcamentoEstourado?: boolean
  contaTrafego?: { id: string; nome: string; slug: string } | null
}

export type CatalogoProduto = {
  id: string
  slug: string
  nome: string
  plataformaAfil: string
  preco: number | null
  comissaoPercent: number | null
  comissaoValor: number | null
  linkCheckout: string | null
  linkLanding: string | null
  status: string
  statusOperacional: string | null
  observacoes: string | null
  ofertaDecisaoId: string | null
  ofertaDecisao?: { id: string; nome: string; vertical: string | null } | null
  conversionPoint: string | null
  tipoProduto: string | null
  ltvEstimadoRebill: number | null
  scoreOrigem: number | null
  budgetTesteAlocado: number | null
  cpaAlvoBreakeven: number | null
  gastoTotalAcumulado: number | null
  receitaConfirmadaAcumulada: number | null
  roiReal: number | null
  cpaReal: number | null
  percentualBudgetConsumido: number | null
  alertaOrcamentoEstourado: boolean
  dataInicioTeste: string | null
  dataUltimaAtualizacaoDados: string | null
  nextReviewAt: string | null
  domainUsed: string | null
  domainReputation: string | null
  moeda: string | null
  criterioPausa: string | null
  criterioEscala: string | null
  campanhas?: CampanhaResumo[]
  _count?: { contas: number; vendas: number; campanhas: number }
}

function money(v: number | null, moeda = "USD") {
  if (v == null) return "—"
  try {
    return v.toLocaleString("en-US", { style: "currency", currency: moeda, minimumFractionDigits: 2 })
  } catch {
    return `${v.toFixed(2)}`
  }
}

export default function CatalogoProdutosClient({ produtos: initial }: { produtos: CatalogoProduto[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [plataformaAfil, setPlat] = useState("BRAIP")
  const [preco, setPreco] = useState("")
  const [comissaoPercent, setComissao] = useState("")
  const [comissaoValor, setComissaoValor] = useState("")
  const [linkCheckout, setCheckout] = useState("")
  const [linkLanding, setLanding] = useState("")
  const [status, setStatus] = useState("ATIVO")
  const [statusOperacional, setStatusOp] = useState("")
  const [observacoes, setObs] = useState("")
  const [conversionPoint, setConversionPoint] = useState("")
  const [tipoProduto, setTipoProduto] = useState("")
  const [budget, setBudget] = useState("")
  const [criterioPausa, setCriterioPausa] = useState("")
  const [criterioEscala, setCriterioEscala] = useState("")
  const [domainUsed, setDomainUsed] = useState("")
  const [moeda, setMoeda] = useState("USD")
  const [campanhaNome, setCampanhaNome] = useState("")
  const [campanhaGeo, setCampanhaGeo] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editing = initial.find((p) => p.id === editId)

  function openNew() {
    setEditId(null)
    setNome(""); setSlug(""); setSlugTouched(false); setPlat("BRAIP")
    setPreco(""); setComissao(""); setComissaoValor(""); setCheckout(""); setLanding("")
    setStatus("ATIVO"); setStatusOp(""); setObs("")
    setConversionPoint(""); setTipoProduto(""); setBudget("")
    setCriterioPausa(""); setCriterioEscala(""); setDomainUsed(""); setMoeda("USD")
    setCampanhaNome(""); setCampanhaGeo(""); setCsvFile(null); setError(null)
    setOpen(true)
  }

  function openEdit(p: CatalogoProduto) {
    setEditId(p.id)
    setNome(p.nome); setSlug(p.slug); setSlugTouched(true); setPlat(p.plataformaAfil)
    setPreco(p.preco != null ? String(p.preco) : "")
    setComissao(p.comissaoPercent != null ? String(p.comissaoPercent) : "")
    setComissaoValor(p.comissaoValor != null ? String(p.comissaoValor) : "")
    setCheckout(p.linkCheckout || ""); setLanding(p.linkLanding || "")
    setStatus(p.status); setStatusOp(p.statusOperacional || ""); setObs(p.observacoes || "")
    setConversionPoint(p.conversionPoint || ""); setTipoProduto(p.tipoProduto || "")
    setBudget(p.budgetTesteAlocado != null ? String(p.budgetTesteAlocado) : "")
    setCriterioPausa(p.criterioPausa || ""); setCriterioEscala(p.criterioEscala || "")
    setDomainUsed(p.domainUsed || ""); setMoeda(p.moeda || "USD")
    setCampanhaNome(""); setCampanhaGeo(""); setCsvFile(null); setError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        nome, slug, plataformaAfil,
        preco: preco === "" ? null : Number(preco),
        comissaoPercent: comissaoPercent === "" ? null : Number(comissaoPercent),
        comissaoValor: comissaoValor === "" ? null : Number(comissaoValor),
        linkCheckout: linkCheckout || null,
        linkLanding: linkLanding || null,
        status,
        statusOperacional: statusOperacional || null,
        observacoes: observacoes || null,
        conversionPoint: conversionPoint || null,
        tipoProduto: tipoProduto || null,
        budgetTesteAlocado: budget === "" ? null : Number(budget),
        criterioPausa: criterioPausa || null,
        criterioEscala: criterioEscala || null,
        domainUsed: domainUsed || null,
        moeda: moeda || null,
      }
      const res = await fetch(
        editId ? apiUrl(`/api/produtos-afiliados/${editId}`) : apiUrl("/api/produtos-afiliados"),
        { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
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

  async function remove(p: CatalogoProduto) {
    if (!confirm(`Excluir produto ${p.nome}?`)) return
    const res = await fetch(apiUrl(`/api/produtos-afiliados/${p.id}`), { method: "DELETE" })
    if (res.ok) router.refresh()
  }

  async function addCampanha() {
    if (!editId || !campanhaNome.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/produtos/${editId}/campanhas`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeCampanhaGoogleAds: campanhaNome.trim(), geo: campanhaGeo || null }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(b.error || "Falha ao criar campanha")
      setCampanhaNome(""); setCampanhaGeo("")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  async function importCsv() {
    if (!editId || !csvFile) return
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", csvFile)
      const res = await fetch(apiUrl(`/api/afiliados/produtos/${editId}/campanhas/import-csv`), { method: "POST", body: fd })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(b.error || "Falha no import")
      setCsvFile(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title="Catálogo de produtos"
        description={`${initial.length} produto(s) — visão operacional`}
        actions={
          <>
            <Link href="/afiliados"><Button variant="ghost">Contas de tráfego</Button></Link>
            <Link href="/afiliados/radar"><Button variant="ghost">Radar</Button></Link>
            <Button onClick={openNew}>+ Produto</Button>
          </>
        }
      />

      {initial.length === 0 ? (
        <EmptyState><p>Nenhum produto no catálogo.</p></EmptyState>
      ) : (
        <Surface className="ce-data-table ce-animate-in">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Nome", "Conv.", "Comercial", "Operação", "Budget", "Gasto", "ROI", "Contas", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--muted-foreground)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initial.map((p) => (
                <Fragment key={p.id}>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: p.alertaOrcamentoEstourado ? "rgba(234,179,8,0.06)" : undefined }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div>{p.nome}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        {p.ofertaDecisaoId ? (
                          <Link href="/afiliados/radar" style={{ color: "var(--primary)" }}>Radar: {p.ofertaDecisao?.nome || "origem"}</Link>
                        ) : p.slug}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{p.conversionPoint ? CONVERSION_POINT_LABELS[p.conversionPoint] : "—"}</td>
                    <td style={{ padding: "10px 12px" }}><Badge variant="outline">{STATUS_PRODUTO_LABELS[p.status]}</Badge></td>
                    <td style={{ padding: "10px 12px" }}>{p.statusOperacional ? <Badge>{STATUS_OPERACIONAL_LABELS[p.statusOperacional]}</Badge> : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{money(p.budgetTesteAlocado, p.moeda || "USD")}</td>
                    <td style={{ padding: "10px 12px" }}>{money(p.gastoTotalAcumulado, p.moeda || "USD")}</td>
                    <td style={{ padding: "10px 12px" }}>{p.roiReal != null ? `${(p.roiReal * 100).toFixed(1)}%` : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button type="button" onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 12 }}>
                        {p.campanhas?.length ?? p._count?.campanhas ?? 0} campanha(s)
                      </button>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <Button variant="ghost" onClick={() => openEdit(p)}>Editar</Button>
                      <Button variant="ghost" onClick={() => remove(p)}>Excluir</Button>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr key={`${p.id}-exp`}>
                      <td colSpan={9} style={{ padding: "8px 16px 16px", background: "var(--surface-raised)", fontSize: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                          <div>Tipo: {p.tipoProduto ? TIPO_PRODUTO_AFILIADO_LABELS[p.tipoProduto] : "—"}</div>
                          <div>Score origem: {p.scoreOrigem != null ? p.scoreOrigem.toFixed(1) : "—"}</div>
                          <div>LTV: {money(p.ltvEstimadoRebill, p.moeda || "USD")}</div>
                          <div>CPA alvo: {money(p.cpaAlvoBreakeven, p.moeda || "USD")}</div>
                          <div>CPA real: {money(p.cpaReal, p.moeda || "USD")}</div>
                          <div>Receita: {money(p.receitaConfirmadaAcumulada, p.moeda || "USD")}</div>
                          <div>Budget consumido: {p.percentualBudgetConsumido != null ? `${(p.percentualBudgetConsumido * 100).toFixed(0)}%` : "—"}</div>
                          <div>Início teste: {p.dataInicioTeste ? new Date(p.dataInicioTeste).toLocaleDateString("pt-BR") : "—"}</div>
                          <div>Dados atualizados: {p.dataUltimaAtualizacaoDados ? new Date(p.dataUltimaAtualizacaoDados).toLocaleDateString("pt-BR") : "—"}</div>
                          <div>
                            Domínio: {p.domainUsed || "—"}{" "}
                            {p.domainReputation && p.domainReputation !== "ok" && (
                              <Link href="/afiliados/radar"><Badge variant="warning">{p.domainReputation}</Badge></Link>
                            )}
                          </div>
                          <div>Pausa: {p.criterioPausa || "—"}</div>
                          <div>Escala: {p.criterioEscala || "—"}</div>
                        </div>
                        {(p.campanhas ?? []).length === 0 ? (
                          <div style={{ color: "var(--muted-foreground)" }}>Nenhuma campanha. Abra Editar para criar ou importar CSV.</div>
                        ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ color: "var(--muted-foreground)", textAlign: "left" }}>
                                <th style={{ padding: 4 }}>Campanha Ads</th>
                                <th style={{ padding: 4 }}>Conta</th>
                                <th style={{ padding: 4 }}>Geo</th>
                                <th style={{ padding: 4 }}>Papel</th>
                                <th style={{ padding: 4 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(p.campanhas ?? []).map((c) => (
                                <tr key={c.id}>
                                  <td style={{ padding: 4 }}>{c.nomeCampanhaGoogleAds}</td>
                                  <td style={{ padding: 4 }}>{c.nomeContaAds || c.contaTrafego?.nome || "—"}</td>
                                  <td style={{ padding: 4 }}>{c.geo || "—"}</td>
                                  <td style={{ padding: 4 }}>{PAPEL_CONTA_ADS_LABELS[c.papelConta] || c.papelConta}</td>
                                  <td style={{ padding: 4 }}>
                                    {STATUS_OPERACIONAL_LABELS[c.status]}
                                    {c.alertaOrcamentoEstourado && <Badge variant="warning" style={{ marginLeft: 6, fontSize: 9 }}>estouro</Badge>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </Surface>
      )}

      {open && (
        <Modal open={open} onClose={() => setOpen(false)} maxWidth="36rem">
          <form onSubmit={save}>
            <ModalHeader title={editId ? "Ficha operacional" : "Novo produto"} onClose={() => setOpen(false)} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Comercial</p>
            <Field label="Nome">
              <Input value={nome} onChange={(e) => { setNome(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)) }} required />
            </Field>
            <Field label="Slug"><Input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value) }} required /></Field>
            <Field label="Plataforma afiliada">
              <Select value={plataformaAfil} onChange={(e) => setPlat(e.target.value)}>
                {Object.entries(PLATAFORMA_AFILIADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Preço"><Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} /></Field>
            <Field label="Comissão %"><Input type="number" step="0.01" value={comissaoPercent} onChange={(e) => setComissao(e.target.value)} /></Field>
            <Field label="Comissão valor ($)"><Input type="number" step="0.01" value={comissaoValor} onChange={(e) => setComissaoValor(e.target.value)} /></Field>
            <Field label="Status comercial">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS_PRODUTO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>

            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Herdado / operação</p>
            {editing?.ofertaDecisaoId && (
              <p style={{ fontSize: 12 }}><Link href="/afiliados/radar">Oferta origem no Radar</Link> {editing.scoreOrigem != null && `· score origem ${editing.scoreOrigem.toFixed(1)}`}</p>
            )}
            <Field label="Conversion point">
              <Select value={conversionPoint} onChange={(e) => setConversionPoint(e.target.value)}>
                <option value="">—</option>
                {Object.entries(CONVERSION_POINT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Tipo">
              <Select value={tipoProduto} onChange={(e) => setTipoProduto(e.target.value)}>
                <option value="">—</option>
                {Object.entries(TIPO_PRODUTO_AFILIADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Status operacional">
              <Select value={statusOperacional} onChange={(e) => setStatusOp(e.target.value)}>
                <option value="">—</option>
                {Object.entries(STATUS_OPERACIONAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Moeda"><Input value={moeda} onChange={(e) => setMoeda(e.target.value)} /></Field>
            <Field label="Domínio em uso"><Input value={domainUsed} onChange={(e) => setDomainUsed(e.target.value)} /></Field>

            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Financeiro</p>
            <Field label="Budget teste alocado"><Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
            {editing && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>
                Gasto {money(editing.gastoTotalAcumulado, editing.moeda || "USD")} · Receita {money(editing.receitaConfirmadaAcumulada, editing.moeda || "USD")} · ROI {editing.roiReal != null ? `${(editing.roiReal * 100).toFixed(1)}%` : "—"} · CPA alvo {money(editing.cpaAlvoBreakeven, editing.moeda || "USD")} (somente leitura)
              </div>
            )}

            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Governança</p>
            <Field label="Critério de pausa"><Textarea value={criterioPausa} onChange={(e) => setCriterioPausa(e.target.value)} rows={2} /></Field>
            <Field label="Critério de escala"><Textarea value={criterioEscala} onChange={(e) => setCriterioEscala(e.target.value)} rows={2} /></Field>
            <Field label="Observações"><Textarea value={observacoes} onChange={(e) => setObs(e.target.value)} rows={2} /></Field>
            <Field label="Link checkout"><Input value={linkCheckout} onChange={(e) => setCheckout(e.target.value)} /></Field>
            <Field label="Link LP"><Input value={linkLanding} onChange={(e) => setLanding(e.target.value)} /></Field>

            {editId && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Campanhas</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Input placeholder="Nome no Google Ads" value={campanhaNome} onChange={(e) => setCampanhaNome(e.target.value)} />
                  <Input placeholder="Geo" value={campanhaGeo} onChange={(e) => setCampanhaGeo(e.target.value)} style={{ maxWidth: 80 }} />
                  <Button type="button" onClick={addCampanha} disabled={saving}>+ Campanha</Button>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
                  <Button type="button" onClick={importCsv} disabled={saving || !csvFile}>Importar CSV</Button>
                </div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>CSV acumulado até a data (colunas: Campaign, Cost, Conversions, Conv. value…)</p>
              </>
            )}

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
