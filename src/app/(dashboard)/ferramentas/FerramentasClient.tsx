"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CATEGORIA_FERRAMENTA_LABELS, STATUS_ASSINATURA_LABELS, STATUS_ASSINATURA_COLORS, formatCurrency,
} from "@/lib/utils"

type Ferramenta = {
  id: string; nome: string; categoria: string; urlAcesso: string | null; versaoAtual: string | null
  statusAssinatura: string; custoMensal: number | null; dataRenovacao: string | null
  responsavelConta: string | null; documentacao: string | null; configuracaoPadrao?: Record<string, unknown> | null; tags: string[]
}

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }
const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }

function diasAteRenovar(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

function emptyForm(): Ferramenta {
  return { id: "", nome: "", categoria: "GERACAO_IMAGEM", urlAcesso: "", versaoAtual: "", statusAssinatura: "ATIVA", custoMensal: null, dataRenovacao: "", responsavelConta: "", documentacao: "", tags: [] }
}

export default function FerramentasClient({ initial }: { initial: Ferramenta[] }) {
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
      const res = await fetch(editing ? `/api/ferramentas/${form.id}` : "/api/ferramentas", {
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
      const res = await fetch(`/api/ferramentas/${form.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir.")
      setOpen(false); router.refresh()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      {/* Dashboard de assinaturas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 6 }}>Custo mensal (ativas + trial)</p>
          <p style={{ color: "var(--foreground)", fontSize: 26, fontWeight: 700 }}>{formatCurrency(custoMensalTotal)}</p>
        </div>
        <div style={card}>
          <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 6 }}>Ferramentas ativas</p>
          <p style={{ color: "var(--foreground)", fontSize: 26, fontWeight: 700 }}>{ativas.length} <span style={{ fontSize: 14, color: "var(--faint)" }}>/ {initial.length}</span></p>
        </div>
        <div style={{ ...card, borderColor: renovacoes.length ? "var(--warning)55" : "var(--border)" }}>
          <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 6 }}>Renovações em 7 dias</p>
          {renovacoes.length === 0 ? (
            <p style={{ color: "var(--success)", fontSize: 15, marginTop: 6 }}>Nenhuma próxima 🎉</p>
          ) : (
            renovacoes.map(({ f, dias }) => (
              <p key={f.id} style={{ color: "var(--warning)", fontSize: 13, marginTop: 4 }}>
                ⚠ {f.nome} — {dias! <= 0 ? "vencida" : `em ${dias}d`}
              </p>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={openNew} style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Nova ferramenta</button>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Nome", "Categoria", "Status", "Custo/mês", "Renovação", "Resp.", ""].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--faint)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
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
                  <td style={{ padding: "12px 16px", color: "var(--foreground)", fontSize: 14, fontWeight: 600 }}>{f.nome}</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 13 }}>{CATEGORIA_FERRAMENTA_LABELS[f.categoria]}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", background: color + "20", color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{STATUS_ASSINATURA_LABELS[f.statusAssinatura]}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--foreground)", fontSize: 13 }}>{f.custoMensal != null ? formatCurrency(f.custoMensal) : "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: alerta ? "var(--warning)" : "var(--faint)" }}>
                    {f.dataRenovacao ? new Date(f.dataRenovacao).toLocaleDateString("pt-BR") : "—"}{alerta ? ` (${dias! <= 0 ? "vencida" : dias + "d"})` : ""}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 13 }}>{f.responsavelConta || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--faint)", fontSize: 12 }}>editar →</td>
                </tr>
              )
            })}
            {initial.length === 0 && <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--faint)" }}>Nenhuma ferramenta cadastrada</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div onClick={() => !saving && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "50px 20px", zIndex: 50, overflowY: "auto" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 560, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>{editing ? "Editar ferramenta" : "Nova ferramenta"}</h2>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Nome *</label><input style={input} value={form.nome} onChange={(e) => set("nome", e.target.value)} required /></div>
              <div><label style={label}>Categoria</label>
                <select style={input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                  {Object.entries(CATEGORIA_FERRAMENTA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Status</label>
                <select style={input} value={form.statusAssinatura} onChange={(e) => set("statusAssinatura", e.target.value)}>
                  {Object.entries(STATUS_ASSINATURA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label style={label}>Custo/mês (R$)</label><input style={input} type="number" step="0.01" min="0" value={form.custoMensal ?? ""} onChange={(e) => set("custoMensal", e.target.value === "" ? null : Number(e.target.value))} /></div>
              <div><label style={label}>Renovação</label><input style={input} type="date" value={form.dataRenovacao ?? ""} onChange={(e) => set("dataRenovacao", e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>URL de acesso</label><input style={input} value={form.urlAcesso ?? ""} onChange={(e) => set("urlAcesso", e.target.value)} /></div>
              <div><label style={label}>Versão atual</label><input style={input} value={form.versaoAtual ?? ""} onChange={(e) => set("versaoAtual", e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Responsável</label><input style={input} value={form.responsavelConta ?? ""} onChange={(e) => set("responsavelConta", e.target.value)} /></div>
              <div><label style={label}>Tags (vírgula)</label><input style={input} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="upscale, character" /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Configuração padrão (JSON)</label>
              <textarea style={{ ...input, minHeight: 80, resize: "vertical", fontFamily: "monospace", fontSize: 12, background: "var(--background)", color: "var(--cyan)" }} value={configJson} onChange={(e) => setConfigJson(e.target.value)} placeholder='{"steps": 30}' spellCheck={false} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Documentação / notas</label>
              <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={form.documentacao ?? ""} onChange={(e) => set("documentacao", e.target.value)} />
            </div>

            {error && <div style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", color: "var(--danger)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>{editing && <button type="button" onClick={remove} disabled={saving} style={{ padding: "10px 16px", background: "transparent", color: "var(--danger)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Excluir</button>}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: "10px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
