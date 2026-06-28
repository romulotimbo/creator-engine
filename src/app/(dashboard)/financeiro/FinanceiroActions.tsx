"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Button, Input, Select, Field, Modal, ModalHeader, FormError, FormActions, Label,
} from "@/components/ui/primitives"

type Persona = { id: string; slug: string }

const today = () => new Date().toISOString().slice(0, 10)

export default function FinanceiroActions({ personas }: { personas: Persona[] }) {
  const router = useRouter()
  const [tipo, setTipo] = useState<"receita" | "custo" | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [personaId, setPersonaId] = useState("")
  const [valor, setValor] = useState("")
  const [data, setData] = useState(today())
  const [descricao, setDescricao] = useState("")
  const [canal, setCanal] = useState("fanvue")
  const [categoria, setCategoria] = useState("ferramenta")
  const [ferramenta, setFerramenta] = useState("")
  const [global, setGlobal] = useState(false)

  function open(t: "receita" | "custo") {
    setTipo(t); setError(null)
    setPersonaId(personas[0]?.id ?? ""); setValor(""); setData(today()); setDescricao("")
    setCanal("fanvue"); setCategoria("ferramenta"); setFerramenta(""); setGlobal(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!valor || Number(valor) <= 0) { setError("Informe um valor positivo."); return }
    if (tipo === "receita" && !personaId) { setError("Selecione a persona."); return }
    if (tipo === "custo" && !global && !personaId) { setError("Selecione a persona ou marque como global."); return }

    setSaving(true)
    try {
      const payload: any = tipo === "receita"
        ? { tipo, personaId, valor, canal, descricao, data }
        : { tipo, personaId: global ? null : personaId, valor, categoria, ferramenta, descricao, data, global }
      const res = await fetch("/api/financeiro", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(typeof b.error === "string" ? b.error : "Falha ao salvar.")
      }
      setTipo(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isReceita = tipo === "receita"

  return (
    <>
      <div className="ce-page-header-actions">
        <Button onClick={() => open("receita")} style={{ background: "var(--success)", color: "var(--background)" }}>
          + Receita
        </Button>
        <Button variant="ghost" onClick={() => open("custo")} style={{ color: "var(--danger)", borderColor: "rgba(248,113,113,0.4)" }}>
          + Custo
        </Button>
      </div>

      <Modal open={!!tipo} onClose={() => !saving && setTipo(null)} maxWidth="30rem">
        <form onSubmit={save}>
          <ModalHeader
            title={isReceita ? "Nova receita" : "Novo custo"}
            onClose={() => !saving && setTipo(null)}
          />

          {isReceita ? (
            <Field label="Persona">
              <Select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                {personas.map((p) => <option key={p.id} value={p.id}>@{p.slug}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Persona">
              <Select value={personaId} disabled={global} onChange={(e) => setPersonaId(e.target.value)} style={{ opacity: global ? 0.5 : 1 }}>
                {personas.map((p) => <option key={p.id} value={p.id}>@{p.slug}</option>)}
              </Select>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input id="glob" type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} />
                <Label htmlFor="glob">Custo global (não atribuído a uma persona)</Label>
              </div>
            </Field>
          )}

          <div className="ce-form-grid" data-cols="2">
            <Field label="Valor (R$)">
              <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </Field>
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </Field>
          </div>

          {isReceita ? (
            <Field label="Canal">
              <Select value={canal} onChange={(e) => setCanal(e.target.value)}>
                {["fanvue", "braip", "ppv", "afiliado", "outro"].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          ) : (
            <div className="ce-form-grid" data-cols="2">
              <Field label="Categoria">
                <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {["ferramenta", "proxy", "publicidade", "outro"].map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Ferramenta (opcional)">
                <Input value={ferramenta} onChange={(e) => setFerramenta(e.target.value)} placeholder="magnific, iproyal..." />
              </Field>
            </div>
          )}

          <Field label="Descrição (opcional)">
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>

          {error && <FormError>{error}</FormError>}

          <FormActions>
            <div />
            <div className="ce-form-actions-end">
              <Button type="button" variant="ghost" onClick={() => setTipo(null)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={saving}
                style={{ background: isReceita ? "var(--success)" : "var(--danger)", color: "var(--background)" }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </FormActions>
        </form>
      </Modal>
    </>
  )
}
