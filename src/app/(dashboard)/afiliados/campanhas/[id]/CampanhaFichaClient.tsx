"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiUrl } from "@/lib/api-url"
import {
  ESTRATEGIA_CAMPANHA_LABELS,
  STATUS_OPERACIONAL_LABELS,
  PAPEL_CONTA_ADS_LABELS,
} from "@/lib/afiliados"
import { AfiliadosMainNav } from "@/components/afiliados/afiliados-main-nav"
import {
  PageHeader, Button, Input, Select, Field, FormError, FormActions, Surface,
} from "@/components/ui/primitives"

export type CampanhaFichaData = {
  id: string
  produtoId: string
  produto: { id: string; slug: string; nome: string }
  nomeCampanhaGoogleAds: string
  geo: string | null
  estrategia: string | null
  papelConta: string
  status: string
  budgetDiarioDefinido: number | null
  budgetTesteAlocado: number | null
  contaTrafegoId: string | null
  contaTrafego: { id: string; slug: string; nome: string } | null
  nomeContaAds: string | null
  dataInicio: string | null
  dataFim: string | null
  linkPainelGoogleAds: string | null
  moeda: string | null
  snapshots: { id: string; dataSnapshot: string; gasto: number | null }[]
}

type ContaOption = { id: string; nome: string; slug: string }

function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function money(v: number | null, moeda = "USD") {
  if (v == null) return "—"
  try {
    return v.toLocaleString("en-US", { style: "currency", currency: moeda, minimumFractionDigits: 2 })
  } catch {
    return `${v.toFixed(2)}`
  }
}

export function CampanhaFichaClient({ initial }: { initial: CampanhaFichaData }) {
  const router = useRouter()
  const [nome, setNome] = useState(initial.nomeCampanhaGoogleAds)
  const [geo, setGeo] = useState(initial.geo || "")
  const [estrategia, setEstrategia] = useState(initial.estrategia || "")
  const [papelConta, setPapel] = useState(initial.papelConta)
  const [status, setStatus] = useState(initial.status)
  const [budgetDiario, setBudgetDiario] = useState(initial.budgetDiarioDefinido != null ? String(initial.budgetDiarioDefinido) : "")
  const [budgetTeste, setBudgetTeste] = useState(initial.budgetTesteAlocado != null ? String(initial.budgetTesteAlocado) : "")
  const [contaTrafegoId, setContaId] = useState(initial.contaTrafegoId || "")
  const [nomeContaAds, setNomeContaAds] = useState(initial.nomeContaAds || "")
  const [dataInicio, setDataInicio] = useState(initial.dataInicio || "")
  const [dataFim, setDataFim] = useState(initial.dataFim || "")
  const [linkPainel, setLinkPainel] = useState(initial.linkPainelGoogleAds || "")
  const [moeda, setMoeda] = useState(initial.moeda || "USD")
  const [contas, setContas] = useState<ContaOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [gasto, setGasto] = useState("")
  const [gastoData, setGastoData] = useState(todaySaoPaulo)
  const [savingGasto, setSavingGasto] = useState(false)
  const [snapshots, setSnapshots] = useState(initial.snapshots)

  useEffect(() => {
    fetch(apiUrl("/api/afiliados"))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setContas(data)
      })
      .catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/campanhas/${initial.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCampanhaGoogleAds: nome.trim(),
          geo: geo || null,
          estrategia: estrategia || null,
          papelConta,
          status,
          budgetDiarioDefinido: budgetDiario === "" ? null : Number(budgetDiario),
          budgetTesteAlocado: budgetTeste === "" ? null : Number(budgetTeste),
          contaTrafegoId: contaTrafegoId || null,
          nomeContaAds: nomeContaAds || null,
          dataInicio: dataInicio || null,
          dataFim: dataFim || null,
          linkPainelGoogleAds: linkPainel || null,
          moeda: moeda || null,
        }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  async function saveGasto(e: React.FormEvent) {
    e.preventDefault()
    if (gasto === "") return
    setSavingGasto(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/campanhas/${initial.id}/snapshots`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gasto: Number(gasto), dataSnapshot: gastoData }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao gravar gasto")
      setSnapshots((prev) => {
        const next = prev.filter((s) => s.dataSnapshot !== gastoData)
        next.unshift({ id: b.snapshotId || gastoData, dataSnapshot: gastoData, gasto: Number(gasto) })
        return next.sort((a, c) => c.dataSnapshot.localeCompare(a.dataSnapshot))
      })
      setGasto("")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSavingGasto(false)
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title={initial.nomeCampanhaGoogleAds}
        description={`Campanha de ${initial.produto.nome}`}
        actions={
          <Link href="/afiliados/produtos">
            <Button variant="ghost">Catálogo</Button>
          </Link>
        }
      />
      <AfiliadosMainNav />

      <p style={{ fontSize: 13, marginBottom: 16 }}>
        Produto:{" "}
        <Link href="/afiliados/produtos" style={{ color: "var(--primary)" }}>
          {initial.produto.nome}
        </Link>
      </p>

      <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        <form onSubmit={save}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Operação</p>
          <Field label="Nome no Google Ads">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Field>
          <Field label="Geo">
            <Input value={geo} onChange={(e) => setGeo(e.target.value)} />
          </Field>
          <Field label="Estratégia">
            <Select value={estrategia} onChange={(e) => setEstrategia(e.target.value)}>
              <option value="">—</option>
              {Object.entries(ESTRATEGIA_CAMPANHA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Papel da conta">
            <Select value={papelConta} onChange={(e) => setPapel(e.target.value)}>
              {Object.entries(PAPEL_CONTA_ADS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status operacional">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_OPERACIONAL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Conta de tráfego">
            <Select value={contaTrafegoId} onChange={(e) => setContaId(e.target.value)}>
              <option value="">—</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nome da conta Ads">
            <Input value={nomeContaAds} onChange={(e) => setNomeContaAds(e.target.value)} />
          </Field>
          <Field label="Budget diário">
            <Input type="number" step="0.01" min="0" value={budgetDiario} onChange={(e) => setBudgetDiario(e.target.value)} />
          </Field>
          <Field label="Budget teste alocado">
            <Input type="number" step="0.01" min="0" value={budgetTeste} onChange={(e) => setBudgetTeste(e.target.value)} />
          </Field>
          <Field label="Início">
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </Field>
          <Field label="Fim">
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </Field>
          <Field label="Link painel Google Ads">
            <Input value={linkPainel} onChange={(e) => setLinkPainel(e.target.value)} />
          </Field>
          <Field label="Moeda">
            <Input value={moeda} onChange={(e) => setMoeda(e.target.value)} />
          </Field>
          <FormActions>
            <Button type="submit" disabled={saving}>{saving ? "…" : "Salvar campanha"}</Button>
          </FormActions>
        </form>
      </Surface>

      <Surface style={{ padding: "var(--space-md)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Gasto</p>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>
          Gasto acumulado até a data (total da campanha, não o valor do dia).
        </p>
        <form onSubmit={saveGasto} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <Field label="Gasto acumulado até">
            <Input type="date" value={gastoData} onChange={(e) => setGastoData(e.target.value)} required />
          </Field>
          <Field label="Valor">
            <Input type="number" step="0.01" min="0" value={gasto} onChange={(e) => setGasto(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={savingGasto}>{savingGasto ? "…" : "Gravar gasto"}</Button>
        </form>

        {snapshots.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhum gasto gravado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--muted-foreground)", textAlign: "left" }}>
                <th style={{ padding: 4 }}>Data</th>
                <th style={{ padding: 4 }}>Gasto</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: 4 }}>{s.dataSnapshot}</td>
                  <td style={{ padding: 4 }}>{money(s.gasto, moeda || "USD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>

      {error && <FormError>{error}</FormError>}
    </div>
  )
}
