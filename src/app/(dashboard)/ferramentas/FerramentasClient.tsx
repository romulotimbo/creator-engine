"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CATEGORIA_FERRAMENTA_LABELS, STATUS_ASSINATURA_LABELS, STATUS_ASSINATURA_COLORS, formatCurrency,
} from "@/lib/utils"
import { apiUrl } from "@/lib/api-url"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormError, FormActions,
  Surface, EmptyState, StatCard,
} from "@/components/ui/primitives"
import CredenciaisPanel, { type CredLog, type CredRow } from "@/components/credenciais/credenciais-panel"

type Ferramenta = {
  id: string; nome: string; categoria: string; urlAcesso: string | null; versaoAtual: string | null
  statusAssinatura: string; custoMensal: number | null; dataRenovacao: string | null
  responsavelConta: string | null; documentacao: string | null; configuracaoPadrao?: Record<string, unknown> | null; tags: string[]
}

function diasAteRenovar(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

function emptyForm(): Ferramenta {
  return { id: "", nome: "", categoria: "GERACAO_IMAGEM", urlAcesso: "", versaoAtual: "", statusAssinatura: "ATIVA", custoMensal: null, dataRenovacao: "", responsavelConta: "", documentacao: "", tags: [] }
}

export default function FerramentasClient({
  initial,
  credenciais = [],
  credenciaisLogs = [],
  ferramentasOpts = [],
}: {
  initial: Ferramenta[]
  credenciais?: CredRow[]
  credenciaisLogs?: CredLog[]
  ferramentasOpts?: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Ferramenta>(emptyForm())
  const [tagsText, setTagsText] = useState("")
  const [configJson, setConfigJson] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editing = !!form.id

  // Dashboard
  const ativas = initial.filter((f) => f.statusAssinatura === "ATIVA" || f.statusAssinatura === "TRIAL")
  const custoMensalTotal = ativas.reduce((s, f) => s + (f.custoMensal || 0), 0)
  const renovacoes = initial
    .map((f) => ({ f, dias: diasAteRenovar(f.dataRenovacao) }))
    .filter((x) => x.dias !== null && x.dias <= 7 && x.f.statusAssinatura !== "CANCELADA")
    .sort((a, b) => (a.dias! - b.dias!))

  function openNew() { setForm(emptyForm()); setTagsText(""); setConfigJson(""); setError(null); setOpen(true) }
  function openEdit(f: Ferramenta) {
    setForm({ ...f, dataRenovacao: f.dataRenovacao ? f.dataRenovacao.slice(0, 10) : "" })
    setTagsText(f.tags.join(", "))
    setConfigJson(f.configuracaoPadrao ? JSON.stringify(f.configuracaoPadrao, null, 2) : "")
    setError(null); setOpen(true)
  }
  function set<K extends keyof Ferramenta>(k: K, v: Ferramenta[K]) { setForm((s) => ({ ...s, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      let configuracaoPadrao: Record<string, unknown> | null = null
      if (configJson.trim()) {
        try { configuracaoPadrao = JSON.parse(configJson) } catch { setError("Configuração JSON inválida."); setSaving(false); return }
      }
      const payload = {
        nome: form.nome, categoria: form.categoria, urlAcesso: form.urlAcesso, versaoAtual: form.versaoAtual,
        statusAssinatura: form.statusAssinatura,
        custoMensal: form.custoMensal === null || (form.custoMensal as any) === "" ? null : form.custoMensal,
        dataRenovacao: form.dataRenovacao || null, responsavelConta: form.responsavelConta,
        documentacao: form.documentacao,
        configuracaoPadrao,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      }
      const res = await fetch(editing ? apiUrl(`/api/ferramentas/${form.id}`) : apiUrl("/api/ferramentas"), {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.") }
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove() {
    if (!editing || !confirm("Excluir esta ferramenta?")) return
    setSaving(true)
    try {
      const res = await fetch(apiUrl(`/api/ferramentas/${form.id}`), { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div
        className="ce-stats-grid ce-animate-in"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}
      >
        <StatCard label="Custo mensal (ativas + trial)" value={formatCurrency(custoMensalTotal)} />
        <StatCard
          label="Ferramentas ativas"
          value={
            <>
              {ativas.length}{" "}
              <span style={{ fontSize: "var(--text-sm)", color: "var(--faint)", fontWeight: 400 }}>/ {initial.length}</span>
            </>
          }
        />
        <StatCard label="Renovações em 7 dias" tone={renovacoes.length ? "warning" : undefined}>
          {renovacoes.length === 0 ? (
            <p style={{ color: "var(--success)", fontSize: 15, marginTop: 6 }}>Nenhuma próxima 🎉</p>
          ) : (
            renovacoes.map(({ f, dias }) => (
              <p key={f.id} style={{ color: "var(--warning)", fontSize: 13, marginTop: 4 }}>
                ⚠ {f.nome} — {dias! <= 0 ? "vencida" : `em ${dias}d`}
              </p>
            ))
          )}
        </StatCard>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-md)" }}>
        <Button onClick={openNew}>+ Nova ferramenta</Button>
      </div>

      <Surface className="ce-data-table" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Nome", "Categoria", "Status", "Custo/mês", "Renovação", "Resp.", ""].map((h) => (
                <th
                  key={h}
                  className="ce-kicker"
                  style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.65rem" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initial.map((f) => {
              const dias = diasAteRenovar(f.dataRenovacao)
              const alerta = dias !== null && dias <= 7 && f.statusAssinatura !== "CANCELADA"
              const color = STATUS_ASSINATURA_COLORS[f.statusAssinatura]
              return (
                <tr key={f.id} onClick={() => openEdit(f)} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--foreground)", fontSize: 14, fontWeight: 600 }}>{f.nome}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--muted-foreground)", fontSize: 13 }}>{CATEGORIA_FERRAMENTA_LABELS[f.categoria]}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        background: `color-mix(in oklch, ${color} 20%, transparent)`,
                        color,
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {STATUS_ASSINATURA_LABELS[f.statusAssinatura]}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--foreground)", fontSize: 13 }}>{f.custoMensal != null ? formatCurrency(f.custoMensal) : "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: 13, color: alerta ? "var(--warning)" : "var(--faint)" }}>
                    {f.dataRenovacao ? new Date(f.dataRenovacao).toLocaleDateString("pt-BR") : "—"}{alerta ? ` (${dias! <= 0 ? "vencida" : dias + "d"})` : ""}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--faint)", fontSize: 13 }}>{f.responsavelConta || "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--faint)", fontSize: 12 }}>editar →</td>
                </tr>
              )
            })}
            {initial.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState>Nenhuma ferramenta cadastrada</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Surface>

      <Modal open={open} onClose={() => !saving && setOpen(false)} maxWidth="35rem">
        <form onSubmit={save}>
          <ModalHeader
            title={editing ? "Editar ferramenta" : "Nova ferramenta"}
            onClose={() => !saving && setOpen(false)}
          />

          <div className="ce-form-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
            <Field label="Nome *">
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
            </Field>
            <Field label="Categoria">
              <Select value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                {Object.entries(CATEGORIA_FERRAMENTA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>

          <div className="ce-form-grid" data-cols="3">
            <Field label="Status">
              <Select value={form.statusAssinatura} onChange={(e) => set("statusAssinatura", e.target.value)}>
                {Object.entries(STATUS_ASSINATURA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Custo/mês (R$)">
              <Input type="number" step="0.01" min="0" value={form.custoMensal ?? ""} onChange={(e) => set("custoMensal", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
            <Field label="Renovação">
              <Input type="date" value={form.dataRenovacao ?? ""} onChange={(e) => set("dataRenovacao", e.target.value)} />
            </Field>
          </div>

          <div className="ce-form-grid" data-cols="2">
            <Field label="URL de acesso">
              <Input value={form.urlAcesso ?? ""} onChange={(e) => set("urlAcesso", e.target.value)} />
            </Field>
            <Field label="Versão atual">
              <Input value={form.versaoAtual ?? ""} onChange={(e) => set("versaoAtual", e.target.value)} />
            </Field>
          </div>

          <div className="ce-form-grid" data-cols="2">
            <Field label="Responsável">
              <Input value={form.responsavelConta ?? ""} onChange={(e) => set("responsavelConta", e.target.value)} />
            </Field>
            <Field label="Tags (vírgula)">
              <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="upscale, character" />
            </Field>
          </div>

          <Field label="Configuração padrão (JSON)">
            <Textarea
              className="ce-input font-mono"
              style={{ minHeight: 80, resize: "vertical", fontSize: 12, color: "var(--cyan)" }}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder='{"steps": 30}'
              spellCheck={false}
            />
          </Field>

          <Field label="Documentação / notas">
            <Textarea
              style={{ minHeight: 60, resize: "vertical" }}
              value={form.documentacao ?? ""}
              onChange={(e) => set("documentacao", e.target.value)}
            />
          </Field>

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div>
              {editing && (
                <Button type="button" variant="danger" onClick={remove} disabled={saving}>
                  Excluir
                </Button>
              )}
            </div>
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </FormActions>
        </form>
      </Modal>

      <CredenciaisPanel
        escopo="global"
        ferramentas={ferramentasOpts}
        credenciais={credenciais}
        logs={credenciaisLogs}
        showHeader
      />
    </>
  )
}
