"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

type Imagem = {
  id: string
  ferramenta: string
  prompt: string
  resultado: string | null
  status: string
  createdAt: string
}

type Fluxo = {
  id: string
  nome: string
  ferramenta: string
  objetivo: string
  confianca: number
  instrucoes: string
  ativo: boolean
  ferramentaRef: { id: string; nome: string } | null
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--background)", border: "1px solid var(--border-strong)",
  borderRadius: 8, color: "var(--foreground)", fontSize: 14, outline: "none",
}
const label: React.CSSProperties = { display: "block", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, marginBottom: 5 }

export default function ImagensClient({
  personaId,
  slug,
  imagens: initial,
  fluxos,
}: {
  personaId: string
  slug: string
  imagens: Imagem[]
  fluxos: Fluxo[]
}) {
  const router = useRouter()
  const [modal, setModal] = useState<"imagem" | "fluxo" | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveImagem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/imagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          ferramenta: fd.get("ferramenta"),
          prompt: fd.get("prompt"),
          resultado: fd.get("resultado") || null,
          status: fd.get("status"),
          notas: fd.get("notas") || null,
        }),
      })
      if (!res.ok) throw new Error("Falha")
      setModal(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function saveFluxo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/fluxos-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          nome: fd.get("nome"),
          ferramenta: fd.get("ferramenta"),
          objetivo: fd.get("objetivo"),
          confianca: Number(fd.get("confianca")),
          instrucoes: fd.get("instrucoes"),
        }),
      })
      if (!res.ok) throw new Error("Falha")
      setModal(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button onClick={() => setModal("imagem")} style={{ padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Nova tentativa</button>
        <button onClick={() => setModal("fluxo")} style={{ padding: "9px 16px", background: "transparent", color: "var(--accent)", border: "1px solid color-mix(in oklch, var(--accent) 40%, transparent)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>+ Novo fluxo</button>
      </div>

      {fluxos.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 12 }}>Fluxos documentados</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fluxos.map((f) => (
              <div key={f.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ color: "var(--foreground)", fontWeight: 600 }}>{f.nome}</p>
                  <span style={{ color: "var(--faint)", fontSize: 12 }}>{f.ferramentaRef?.nome ?? f.ferramenta} · confiança {f.confianca}/5</span>
                </div>
                <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{f.objetivo}</p>
                <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>{f.instrucoes.slice(0, 160)}{f.instrucoes.length > 160 ? "…" : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {initial.map((img) => (
          <div key={img.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            {img.resultado && (
              <div style={{ aspectRatio: "1", background: "var(--border)", borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
                <img src={img.resultado} alt="Imagem gerada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <p style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 4 }}>{img.ferramenta} · {formatDate(img.createdAt)}</p>
            <p style={{ color: "var(--faint)", fontSize: 12, lineHeight: 1.5 }}>{img.prompt.slice(0, 100)}…</p>
            <span style={{ display: "inline-block", marginTop: 8, padding: "2px 8px", background: img.status === "aprovada" ? "var(--success)20" : "var(--faint)20", color: img.status === "aprovada" ? "var(--success)" : "var(--faint)", borderRadius: 4, fontSize: 11 }}>{img.status}</span>
          </div>
        ))}
        {initial.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 64, color: "var(--faint)" }}>
            Nenhuma imagem gerada ainda. Registre tentativas de geração aqui.
          </div>
        )}
      </div>

      {modal === "imagem" && (
        <div onClick={() => !saving && setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 50 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveImagem} style={{ width: "100%", maxWidth: 480, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 18 }}>Nova tentativa</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={label}>Ferramenta</label><input name="ferramenta" style={input} required placeholder="magnific, flux…" /></div>
              <div><label style={label}>Prompt</label><textarea name="prompt" style={{ ...input, minHeight: 100 }} required /></div>
              <div><label style={label}>URL resultado</label><input name="resultado" style={input} placeholder="https://…" /></div>
              <div><label style={label}>Status</label><select name="status" style={input} defaultValue="pendente"><option value="pendente">pendente</option><option value="aprovada">aprovada</option><option value="descartada">descartada</option></select></div>
              <div><label style={label}>Notas</label><textarea name="notas" style={{ ...input, minHeight: 60 }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModal(null)} style={{ padding: "9px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, cursor: "pointer" }}>Salvar</button>
            </div>
          </form>
        </div>
      )}

      {modal === "fluxo" && (
        <div onClick={() => !saving && setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 50 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveFluxo} style={{ width: "100%", maxWidth: 480, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 18 }}>Novo fluxo de imagem</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={label}>Nome</label><input name="nome" style={input} required /></div>
              <div><label style={label}>Ferramenta</label><input name="ferramenta" style={input} required /></div>
              <div><label style={label}>Objetivo</label><input name="objetivo" style={input} required /></div>
              <div><label style={label}>Confiança (1-5)</label><input name="confianca" type="number" min={1} max={5} style={input} defaultValue={3} /></div>
              <div><label style={label}>Instruções</label><textarea name="instrucoes" style={{ ...input, minHeight: 100 }} required /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModal(null)} style={{ padding: "9px 16px", background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: "9px 16px", background: "var(--accent)", color: "var(--accent-foreground)", border: "none", borderRadius: 8, cursor: "pointer" }}>Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
