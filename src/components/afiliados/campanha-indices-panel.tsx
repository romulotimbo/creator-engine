"use client"

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { apiUrl } from "@/lib/api-url"
import {
  CHAVE_DISPOSITIVO_LABELS,
  CORRESPONDENCIA_LABELS,
  STATUS_INDICE_LABELS,
  type ChaveDispositivo,
} from "@/lib/afiliados/indices"
import { Button, Input, Select, Field, Surface } from "@/components/ui/primitives"

export type IndiceVigente = {
  id: string
  tipo: "PALAVRA_CHAVE" | "DISPOSITIVO" | "LOCAL" | "PUBLICO"
  chave: string
  correspondencia: string | null
  validadoVisualmente: boolean
  negativado: boolean
  vigente: {
    status: string
    ajusteLancePct: number
    cpc: number | null
    cliques: number | null
    impressoes: number | null
    vendasConversao: number | null
    custoConversao: number | null
    roi: number | null
  } | null
}

function num(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
}

function pct(v: number | null | undefined) {
  if (v == null) return "—"
  return `${v}%`
}

type LinhaForm = {
  status: string
  ajusteLancePct: string
  cpc: string
  cliques: string
  impressoes: string
  vendasConversao: string
  custoConversao: string
  roi: string
}

function emptyLinha(v: IndiceVigente["vigente"]): LinhaForm {
  return {
    status: v?.status ?? "ATIVO",
    ajusteLancePct: v != null ? String(v.ajusteLancePct) : "0",
    cpc: "",
    cliques: "",
    impressoes: "",
    vendasConversao: "",
    custoConversao: "",
    roi: "",
  }
}

function payloadLinha(f: LinhaForm) {
  const opt = (s: string) => (s.trim() === "" ? undefined : Number(s))
  return {
    status: f.status,
    ajusteLancePct: Number(f.ajusteLancePct),
    cpc: opt(f.cpc),
    cliques: opt(f.cliques),
    impressoes: opt(f.impressoes),
    vendasConversao: opt(f.vendasConversao),
    custoConversao: opt(f.custoConversao),
    roi: opt(f.roi),
  }
}

export function CampanhaIndicesPanel({ campanhaId }: { campanhaId: string }) {
  const [indices, setIndices] = useState<IndiceVigente[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [linhaForm, setLinhaForm] = useState<LinhaForm>(emptyLinha(null))

  const [kw, setKw] = useState({ chave: "", correspondencia: "EXATA", lance: "0" })
  const [local, setLocal] = useState({ chave: "", lance: "0" })
  const [publico, setPublico] = useState({ chave: "", lance: "0" })

  const load = useCallback(async () => {
    const res = await fetch(apiUrl(`/api/afiliados/campanhas/${campanhaId}/indices`))
    if (!res.ok) throw new Error("Falha ao carregar índices")
    setIndices(await res.json())
  }, [campanhaId])

  useEffect(() => {
    load().catch((e: unknown) => setError(e instanceof Error ? e.message : "Falha"))
  }, [load])

  async function criar(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/campanhas/${campanhaId}/indices`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao criar")
      await load()
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function registrarLinha(indiceId: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/campanhas/${campanhaId}/indices/${indiceId}/linhas`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadLinha(linhaForm)),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao registrar")
      setEditId(null)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha")
    } finally {
      setBusy(false)
    }
  }

  async function toggleFlag(indice: IndiceVigente, campo: "validadoVisualmente" | "negativado") {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/campanhas/${campanhaId}/indices/${indice.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: !indice[campo] }),
      })
      const b = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof b.error === "string" ? b.error : "Falha ao atualizar")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha")
    } finally {
      setBusy(false)
    }
  }

  const keywords = indices.filter((i) => i.tipo === "PALAVRA_CHAVE")
  const devices = TRIO_ORDER(indices.filter((i) => i.tipo === "DISPOSITIVO"))
  const locais = indices.filter((i) => i.tipo === "LOCAL")
  const publicos = indices.filter((i) => i.tipo === "PUBLICO")

  return (
    <Surface style={{ padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>
        Índices do experimento
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
        Lance e status são registro no Creator Engine — não escrevem no Google Ads.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
        Métricas do índice = acumulado Ads desde o início da campanha, distintos do rollup por venda confirmada.
      </p>
      {error && <p style={{ fontSize: 13, color: "var(--danger, #f87171)", marginBottom: 12 }}>{error}</p>}

      <Bloco titulo="Palavras-chave">
        {keywords.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhuma palavra-chave.</p>
        ) : (
          <Tabela
            indices={keywords}
            extraHeader={<><th style={th}>Match</th><th style={th}>Validado</th><th style={th}>Negativado</th></>}
            extraCell={(i) => (
              <>
                <td style={td}>{CORRESPONDENCIA_LABELS[i.correspondencia || ""] || i.correspondencia || "—"}</td>
                <td style={td}>
                  <button type="button" onClick={() => toggleFlag(i, "validadoVisualmente")} disabled={busy} style={linkBtn}>
                    {i.validadoVisualmente ? "sim" : "não"}
                  </button>
                </td>
                <td style={td}>
                  <button type="button" onClick={() => toggleFlag(i, "negativado")} disabled={busy} style={linkBtn}>
                    {i.negativado ? "sim" : "não"}
                  </button>
                </td>
              </>
            )}
            editId={editId}
            setEditId={setEditId}
            linhaForm={linhaForm}
            setLinhaForm={setLinhaForm}
            onRegistrar={registrarLinha}
            busy={busy}
            showRoi={false}
          />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            criar({
              tipo: "PALAVRA_CHAVE",
              chave: kw.chave,
              correspondencia: kw.correspondencia,
              status: "ATIVO",
              ajusteLancePct: Number(kw.lance),
              cliques: 0,
            }).then((ok) => { if (ok) setKw({ chave: "", correspondencia: "EXATA", lance: "0" }) })
          }}
          style={formRow}
        >
          <Field label="Palavra-chave">
            <Input value={kw.chave} onChange={(e) => setKw({ ...kw, chave: e.target.value })} required />
          </Field>
          <Field label="Correspondência">
            <Select value={kw.correspondencia} onChange={(e) => setKw({ ...kw, correspondencia: e.target.value })}>
              {Object.entries(CORRESPONDENCIA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lance %">
            <Input type="number" step="0.01" value={kw.lance} onChange={(e) => setKw({ ...kw, lance: e.target.value })} />
          </Field>
          <Button type="submit" disabled={busy}>Adicionar</Button>
        </form>
      </Bloco>

      <Bloco titulo="Dispositivos">
        <Tabela
          indices={devices}
          label={(i) => CHAVE_DISPOSITIVO_LABELS[i.chave as ChaveDispositivo] || i.chave}
          editId={editId}
          setEditId={setEditId}
          linhaForm={linhaForm}
          setLinhaForm={setLinhaForm}
          onRegistrar={registrarLinha}
          busy={busy}
          showRoi={false}
        />
      </Bloco>

      <Bloco titulo="Locais">
        {locais.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhum local.</p>
        ) : (
          <Tabela
            indices={locais}
            editId={editId}
            setEditId={setEditId}
            linhaForm={linhaForm}
            setLinhaForm={setLinhaForm}
            onRegistrar={registrarLinha}
            busy={busy}
            showRoi
          />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            criar({ tipo: "LOCAL", chave: local.chave, status: "ATIVO", ajusteLancePct: Number(local.lance) })
              .then((ok) => { if (ok) setLocal({ chave: "", lance: "0" }) })
          }}
          style={formRow}
        >
          <Field label="Local">
            <Input value={local.chave} onChange={(e) => setLocal({ ...local, chave: e.target.value })} required />
          </Field>
          <Field label="Lance %">
            <Input type="number" step="0.01" value={local.lance} onChange={(e) => setLocal({ ...local, lance: e.target.value })} />
          </Field>
          <Button type="submit" disabled={busy}>Adicionar</Button>
        </form>
      </Bloco>

      <Bloco titulo="Públicos">
        {publicos.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhum público.</p>
        ) : (
          <Tabela
            indices={publicos}
            editId={editId}
            setEditId={setEditId}
            linhaForm={linhaForm}
            setLinhaForm={setLinhaForm}
            onRegistrar={registrarLinha}
            busy={busy}
            showRoi
          />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            criar({ tipo: "PUBLICO", chave: publico.chave, status: "ATIVO", ajusteLancePct: Number(publico.lance) })
              .then((ok) => { if (ok) setPublico({ chave: "", lance: "0" }) })
          }}
          style={formRow}
        >
          <Field label="Público">
            <Input value={publico.chave} onChange={(e) => setPublico({ ...publico, chave: e.target.value })} required />
          </Field>
          <Field label="Lance %">
            <Input type="number" step="0.01" value={publico.lance} onChange={(e) => setPublico({ ...publico, lance: e.target.value })} />
          </Field>
          <Button type="submit" disabled={busy}>Adicionar</Button>
        </form>
      </Bloco>
    </Surface>
  )
}

function TRIO_ORDER(list: IndiceVigente[]) {
  const ordem = ["SMARTPHONE", "TABLET", "COMPUTADOR"]
  return [...list].sort((a, b) => ordem.indexOf(a.chave) - ordem.indexOf(b.chave))
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{titulo}</p>
      {children}
    </div>
  )
}

const th: CSSProperties = { padding: 4, textAlign: "left", color: "var(--muted-foreground)", fontWeight: 500 }
const td: CSSProperties = { padding: 4 }
const linkBtn: CSSProperties = { background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 12, padding: 0 }
const formRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }

function Tabela({
  indices,
  extraHeader,
  extraCell,
  label,
  editId,
  setEditId,
  linhaForm,
  setLinhaForm,
  onRegistrar,
  busy,
  showRoi,
}: {
  indices: IndiceVigente[]
  extraHeader?: ReactNode
  extraCell?: (i: IndiceVigente) => ReactNode
  label?: (i: IndiceVigente) => string
  editId: string | null
  setEditId: (id: string | null) => void
  linhaForm: LinhaForm
  setLinhaForm: (f: LinhaForm) => void
  onRegistrar: (id: string) => void
  busy: boolean
  showRoi: boolean
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          <th style={th}>Índice</th>
          {extraHeader}
          <th style={th}>Status</th>
          <th style={th}>Lance</th>
          <th style={th}>CPC</th>
          <th style={th}>Cliques</th>
          <th style={th}>Impr.</th>
          <th style={th}>Vendas U$</th>
          <th style={th}>Custo conv.</th>
          {showRoi && <th style={th}>ROI</th>}
          <th style={th} />
        </tr>
      </thead>
      <tbody>
        {indices.map((i) => (
          <FragmentRow key={i.id}>
            <tr>
              <td style={td}>{label ? label(i) : i.chave}</td>
              {extraCell?.(i)}
              <td style={td}>{i.vigente ? STATUS_INDICE_LABELS[i.vigente.status] || i.vigente.status : "—"}</td>
              <td style={td}>{i.vigente ? pct(i.vigente.ajusteLancePct) : "—"}</td>
              <td style={td}>{num(i.vigente?.cpc)}</td>
              <td style={td}>{num(i.vigente?.cliques)}</td>
              <td style={td}>{num(i.vigente?.impressoes)}</td>
              <td style={td}>{num(i.vigente?.vendasConversao)}</td>
              <td style={td}>{num(i.vigente?.custoConversao)}</td>
              {showRoi && <td style={td}>{num(i.vigente?.roi)}</td>}
              <td style={td}>
                <button
                  type="button"
                  style={linkBtn}
                  onClick={() => {
                    if (editId === i.id) setEditId(null)
                    else {
                      setLinhaForm(emptyLinha(i.vigente))
                      setEditId(i.id)
                    }
                  }}
                >
                  {editId === i.id ? "fechar" : "registrar"}
                </button>
              </td>
            </tr>
            {editId === i.id && (
              <tr>
                <td colSpan={12} style={{ padding: "8px 4px 12px" }}>
                  <form
                    onSubmit={(e) => { e.preventDefault(); onRegistrar(i.id) }}
                    style={formRow}
                  >
                    <Field label="Status">
                      <Select value={linhaForm.status} onChange={(e) => setLinhaForm({ ...linhaForm, status: e.target.value })}>
                        {Object.entries(STATUS_INDICE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Lance %">
                      <Input type="number" step="0.01" value={linhaForm.ajusteLancePct} onChange={(e) => setLinhaForm({ ...linhaForm, ajusteLancePct: e.target.value })} required />
                    </Field>
                    <Field label="CPC"><Input type="number" step="0.0001" value={linhaForm.cpc} onChange={(e) => setLinhaForm({ ...linhaForm, cpc: e.target.value })} /></Field>
                    <Field label="Cliques"><Input type="number" value={linhaForm.cliques} onChange={(e) => setLinhaForm({ ...linhaForm, cliques: e.target.value })} /></Field>
                    <Field label="Impressões"><Input type="number" value={linhaForm.impressoes} onChange={(e) => setLinhaForm({ ...linhaForm, impressoes: e.target.value })} /></Field>
                    <Field label="Vendas U$"><Input type="number" step="0.01" value={linhaForm.vendasConversao} onChange={(e) => setLinhaForm({ ...linhaForm, vendasConversao: e.target.value })} /></Field>
                    <Field label="Custo conv."><Input type="number" step="0.01" value={linhaForm.custoConversao} onChange={(e) => setLinhaForm({ ...linhaForm, custoConversao: e.target.value })} /></Field>
                    {showRoi && (
                      <Field label="ROI"><Input type="number" step="0.0001" value={linhaForm.roi} onChange={(e) => setLinhaForm({ ...linhaForm, roi: e.target.value })} /></Field>
                    )}
                    <Button type="submit" disabled={busy}>Gravar linha</Button>
                  </form>
                </td>
              </tr>
            )}
          </FragmentRow>
        ))}
      </tbody>
    </table>
  )
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>
}
