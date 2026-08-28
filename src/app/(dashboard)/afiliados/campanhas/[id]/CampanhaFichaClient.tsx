"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiUrl } from "@/lib/api-url"
import {
  ESTRATEGIA_CAMPANHA_LABELS,
  STATUS_OPERACIONAL_LABELS,
  PAPEL_CONTA_ADS_LABELS,
  TIPO_BRIDGE_LABELS,
  MOTIVO_ENCERRAMENTO_LABELS,
} from "@/lib/afiliados"
import { PRIORIDADE_FILA_LABELS } from "@/lib/afiliados/fila"
import { ORIGEM_AJUSTE_LABELS, TIPO_AJUSTE_LABELS } from "@/lib/afiliados/ajustes"
import { formatDate } from "@/lib/utils"
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
  linkBridge: string | null
  tipoBridge: string | null
  bridgeObservacoes: string | null
  motivoEncerramento: string | null
  gastoTotalAcumulado: number | null
  receitaConfirmadaAcumulada: number | null
  roiReal: number | null
  cpaReal: number | null
  snapshots: {
    id: string
    dataSnapshot: string
    gasto: number | null
    receitaConfirmada: number | null
    roiReal: number | null
    cpaReal: number | null
    checkoutsCount: number | null
  }[]
  statusLogs: {
    id: string
    statusAnterior: string | null
    statusNovo: string
    motivo: string | null
    data: string
  }[]
  itensFila: {
    id: string
    regra: string
    prioridade: string
    resumo: string
    status: string
    createdAt: string
  }[]
  ritmoEntrega: "ABAIXO" | "NORMAL" | "ACIMA" | "SEM_BUDGET" | null
  segmentosMes: { dimensao: string; valor: string; gasto: number; conversoes: number; cpaSegmento: number | null }[]
  ajustes: {
    id: string
    origem: string
    tipo: string
    valorAnterior: number | null
    valorNovo: number | null
    data: string
    motivo: string | null
  }[]
}

const RITMO_ENTREGA_LABELS: Record<string, string> = {
  ABAIXO: "⚠️ Abaixo do budget diário — campanha pode ter parado de entregar",
  NORMAL: "✅ Ritmo de entrega normal",
  ACIMA: "📈 Acima do budget diário (overdelivery)",
  SEM_BUDGET: "Budget diário não definido",
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
  const [linkBridge, setLinkBridge] = useState(initial.linkBridge || "")
  const [tipoBridge, setTipoBridge] = useState(initial.tipoBridge || "")
  const [bridgeObservacoes, setBridgeObservacoes] = useState(initial.bridgeObservacoes || "")
  const [motivoEncerramento, setMotivoEncerramento] = useState(initial.motivoEncerramento || "")
  const [contas, setContas] = useState<ContaOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [gasto, setGasto] = useState("")
  const [gastoData, setGastoData] = useState(todaySaoPaulo)
  const [savingGasto, setSavingGasto] = useState(false)
  const [snapshots, setSnapshots] = useState(initial.snapshots)

  const [ajusteTipo, setAjusteTipo] = useState("BUDGET")
  const [ajusteAnterior, setAjusteAnterior] = useState("")
  const [ajusteNovo, setAjusteNovo] = useState("")
  const [ajusteData, setAjusteData] = useState(todaySaoPaulo)
  const [ajusteMotivo, setAjusteMotivo] = useState("")
  const [savingAjuste, setSavingAjuste] = useState(false)

  async function saveAjuste(e: React.FormEvent) {
    e.preventDefault()
    setSavingAjuste(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/campanhas/${initial.id}/ajustes`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: ajusteTipo,
          valorAnterior: ajusteAnterior === "" ? null : Number(ajusteAnterior),
          valorNovo: ajusteNovo === "" ? null : Number(ajusteNovo),
          data: ajusteData,
          motivo: ajusteMotivo || null,
        }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao registrar ajuste")
      setAjusteAnterior("")
      setAjusteNovo("")
      setAjusteMotivo("")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSavingAjuste(false)
    }
  }

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
          linkBridge: linkBridge || null,
          tipoBridge: tipoBridge || null,
          bridgeObservacoes: bridgeObservacoes || null,
          motivoEncerramento: status === "ENCERRADO" ? (motivoEncerramento || null) : null,
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
        const existing = prev.find((s) => s.dataSnapshot === gastoData)
        const next = prev.filter((s) => s.dataSnapshot !== gastoData)
        next.unshift({
          id: b.snapshotId || gastoData,
          dataSnapshot: gastoData,
          gasto: Number(gasto),
          receitaConfirmada: existing?.receitaConfirmada ?? null,
          roiReal: existing?.roiReal ?? null,
          cpaReal: existing?.cpaReal ?? null,
          checkoutsCount: existing?.checkoutsCount ?? null,
        })
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

          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginTop: 16 }}>
            LP bridge
          </p>
          <Field label="Link da bridge">
            <Input value={linkBridge} onChange={(e) => setLinkBridge(e.target.value)} />
          </Field>
          <Field label="Tipo de bridge">
            <Select value={tipoBridge} onChange={(e) => setTipoBridge(e.target.value)}>
              <option value="">—</option>
              {Object.entries(TIPO_BRIDGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Observações da bridge">
            <Input value={bridgeObservacoes} onChange={(e) => setBridgeObservacoes(e.target.value)} />
          </Field>

          {status === "ENCERRADO" && (
            <Field label="Motivo do encerramento">
              <Select value={motivoEncerramento} onChange={(e) => setMotivoEncerramento(e.target.value)}>
                <option value="">—</option>
                {Object.entries(MOTIVO_ENCERRAMENTO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          )}

          <FormActions>
            <Button type="submit" disabled={saving}>{saving ? "…" : "Salvar campanha"}</Button>
          </FormActions>
        </form>
      </Surface>

      <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 12 }}>
          Rollups — venda confirmada vs. referência do Ads
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
              📊 Por venda confirmada (decisão)
            </p>
            <p style={{ fontSize: 13 }}>Gasto: {money(initial.gastoTotalAcumulado, moeda || "USD")}</p>
            <p style={{ fontSize: 13 }}>Receita confirmada: {money(initial.receitaConfirmadaAcumulada, moeda || "USD")}</p>
            <p style={{ fontSize: 13 }}>ROI: {initial.roiReal != null ? `${(initial.roiReal * 100).toFixed(1)}%` : "—"}</p>
            <p style={{ fontSize: 13 }}>CPA: {money(initial.cpaReal, moeda || "USD")}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
              🔎 Referência do Ads (auditoria)
            </p>
            <p style={{ fontSize: 13 }}>Receita reportada: {money(snapshots[0]?.receitaConfirmada ?? null, moeda || "USD")}</p>
            <p style={{ fontSize: 13 }}>ROI reportado: {snapshots[0]?.roiReal != null ? `${(snapshots[0].roiReal * 100).toFixed(1)}%` : "—"}</p>
            <p style={{ fontSize: 13 }}>CPA reportado: {money(snapshots[0]?.cpaReal ?? null, moeda || "USD")}</p>
            <p style={{ fontSize: 13 }}>Checkouts (acumulado): {snapshots[0]?.checkoutsCount ?? "—"}</p>
          </div>
        </div>
        {initial.ritmoEntrega && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            {RITMO_ENTREGA_LABELS[initial.ritmoEntrega]}
          </p>
        )}
      </Surface>

      {initial.itensFila.length > 0 && (
        <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>
            Fila de decisão — itens abertos
          </p>
          {initial.itensFila.map((item) => (
            <div key={item.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{PRIORIDADE_FILA_LABELS[item.prioridade] || item.prioridade}</span>
              {" · "}{item.regra} — {item.resumo}
            </div>
          ))}
          <Link href="/afiliados/fila" className="ce-link-accent" style={{ fontSize: 12 }}>
            Ver na fila de decisão →
          </Link>
        </Surface>
      )}

      <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>
          Ajustes aplicados
        </p>
        {initial.ajustes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>Nenhum ajuste registrado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
            <thead>
              <tr style={{ color: "var(--muted-foreground)", textAlign: "left" }}>
                <th style={{ padding: 4 }}>Data</th>
                <th style={{ padding: 4 }}>Origem</th>
                <th style={{ padding: 4 }}>Tipo</th>
                <th style={{ padding: 4 }}>Anterior → Novo</th>
                <th style={{ padding: 4 }}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {initial.ajustes.map((a) => (
                <tr key={a.id}>
                  <td style={{ padding: 4 }}>{formatDate(new Date(a.data))}</td>
                  <td style={{ padding: 4 }}>{ORIGEM_AJUSTE_LABELS[a.origem] || a.origem}</td>
                  <td style={{ padding: 4 }}>{TIPO_AJUSTE_LABELS[a.tipo] || a.tipo}</td>
                  <td style={{ padding: 4 }}>{a.valorAnterior ?? "—"} → {a.valorNovo ?? "—"}</td>
                  <td style={{ padding: 4, color: "var(--muted-foreground)" }}>{a.motivo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={saveAjuste} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Tipo">
            <Select value={ajusteTipo} onChange={(e) => setAjusteTipo(e.target.value)}>
              {Object.entries(TIPO_AJUSTE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Valor anterior">
            <Input type="number" step="0.01" value={ajusteAnterior} onChange={(e) => setAjusteAnterior(e.target.value)} />
          </Field>
          <Field label="Valor novo">
            <Input type="number" step="0.01" value={ajusteNovo} onChange={(e) => setAjusteNovo(e.target.value)} />
          </Field>
          <Field label="Data">
            <Input type="date" value={ajusteData} onChange={(e) => setAjusteData(e.target.value)} required />
          </Field>
          <Field label="Motivo">
            <Input value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} />
          </Field>
          <Button type="submit" disabled={savingAjuste}>{savingAjuste ? "…" : "Registrar ajuste manual"}</Button>
        </form>
      </Surface>

      {initial.segmentosMes.length > 0 && (
        <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>
            Segmentos (geo × dispositivo) — mês corrente
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--muted-foreground)", textAlign: "left" }}>
                <th style={{ padding: 4 }}>Dimensão</th>
                <th style={{ padding: 4 }}>Valor</th>
                <th style={{ padding: 4 }}>Gasto</th>
                <th style={{ padding: 4 }}>Conversões</th>
                <th style={{ padding: 4 }}>CPA</th>
              </tr>
            </thead>
            <tbody>
              {initial.segmentosMes.map((s) => (
                <tr key={`${s.dimensao}-${s.valor}`}>
                  <td style={{ padding: 4 }}>{s.dimensao === "GEO" ? "Geo" : "Dispositivo"}</td>
                  <td style={{ padding: 4 }}>{s.valor}</td>
                  <td style={{ padding: 4 }}>{money(s.gasto, moeda || "USD")}</td>
                  <td style={{ padding: 4 }}>{s.conversoes}</td>
                  <td style={{ padding: 4 }}>{money(s.cpaSegmento, moeda || "USD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      )}

      {initial.statusLogs.length > 0 && (
        <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>
            Histórico de status
          </p>
          {initial.statusLogs.map((log) => (
            <div key={log.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              {formatDate(new Date(log.data))} — {log.statusAnterior ? `${STATUS_OPERACIONAL_LABELS[log.statusAnterior] || log.statusAnterior} → ` : ""}
              {STATUS_OPERACIONAL_LABELS[log.statusNovo] || log.statusNovo}
              {log.motivo && <span style={{ color: "var(--muted-foreground)" }}> ({log.motivo})</span>}
            </div>
          ))}
        </Surface>
      )}

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
