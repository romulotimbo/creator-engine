"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Button, Input, Textarea, Select, Field, Modal, ModalHeader, FormActions,
  FormError, Surface, SectionTitle, EmptyState,
} from "@/components/ui/primitives"
import { tk } from "@/lib/tokens"
import { FORMATO_LABELS, type FormatoId } from "../../../../brand/tokens"
import type { Timeline } from "@/lib/estudio/timeline"
import RoteiroPreview from "./RoteiroPreview"
import type {
  EstudioData, RoteiroLite, FonteLite,
} from "./types"

const FORMATOS: FormatoId[] = ["VERTICAL_9_16", "QUADRADO_1_1", "RETRATO_4_5"]
const ESTILOS = ["impacto", "conviccao"] as const
const ANIMACOES = ["write-on", "corte-seco", "fade"] as const
const POSICOES = ["safe-top", "safe-center", "safe-bottom"] as const

const STATUS_COR: Record<string, string> = {
  FILA: tk.faint, RENDERIZANDO: tk.cyan, POS: tk.warning, PRONTO: tk.success, ERRO: tk.danger,
}
const STATUS_LABEL: Record<string, string> = {
  FILA: "Na fila", RENDERIZANDO: "Renderizando", POS: "Pós", PRONTO: "Pronto", ERRO: "Erro",
}

type Tab = "roteiros" | "fontes" | "jobs" | "templates" | "assets"
type TrackDraft = {
  tipo: "texto" | "asset"
  inicio: number
  fim: number
  conteudo?: string
  estilo?: "impacto" | "conviccao"
  assetTag?: string
  animacao: "write-on" | "corte-seco" | "fade"
  posicao: "safe-top" | "safe-center" | "safe-bottom"
}

export default function EstudioClient({ data }: { data: EstudioData }) {
  const [tab, setTab] = useState<Tab>("roteiros")

  const tabs: { id: Tab; label: string }[] = [
    { id: "roteiros", label: `Roteiros (${data.roteiros.length})` },
    { id: "fontes", label: `Fontes (${data.fontes.length})` },
    { id: "jobs", label: `Jobs (${data.jobs.length})` },
    { id: "templates", label: `Templates (${data.templates.length})` },
    { id: "assets", label: `Assets (${data.assets.length})` },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <nav className="ce-persona-nav" aria-label="Seções do estúdio">
        {tabs.map((t) => (
          <button key={t.id} type="button" data-active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "roteiros" && <RoteirosTab data={data} />}
      {tab === "fontes" && <FontesTab fontes={data.fontes} personas={data.personas} />}
      {tab === "jobs" && <JobsTab data={data} />}
      {tab === "templates" && <TemplatesTab templates={data.templates} />}
      {tab === "assets" && <AssetsTab assets={data.assets} />}
    </div>
  )
}

function nomePersona(data: EstudioData, personaId: string | null) {
  if (!personaId) return "—"
  return data.personas.find((p) => p.id === personaId)?.nomeArtistico ?? personaId
}

// ─── ROTEIROS ────────────────────────────────────────────────────────────────
function RoteirosTab({ data }: { data: EstudioData }) {
  const router = useRouter()
  const [editando, setEditando] = useState<RoteiroLite | null>(null)
  const [novo, setNovo] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function enfileirar(r: RoteiroLite) {
    setMsg(null)
    const res = await fetch("/api/estudio/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roteiroId: r.id }),
    })
    if (res.ok) {
      setMsg(`Render enfileirado para "${r.nome}".`)
      router.refresh()
    } else {
      const e = await res.json().catch(() => ({}))
      setMsg(`Erro ao enfileirar: ${e.detalhes?.join("; ") || e.error || res.status}`)
    }
  }

  async function excluir(r: RoteiroLite) {
    if (!confirm(`Excluir o roteiro "${r.nome}"?`)) return
    await fetch(`/api/estudio/roteiros/${r.id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <Surface>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <SectionTitle>Roteiros de estilização</SectionTitle>
        <Button onClick={() => setNovo(true)}>+ Novo roteiro</Button>
      </div>
      {msg && <p style={{ color: tk.muted, fontSize: "0.8rem", marginBottom: "var(--space-sm)" }}>{msg}</p>}

      {data.roteiros.length === 0 ? (
        <EmptyState>Nenhum roteiro ainda. Crie um para montar a timeline de texto/assets.</EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.roteiros.map((r) => {
            const fonte = data.fontes.find((f) => f.id === r.fonteVideoId)
            return (
              <div key={r.id} style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600 }}>{r.nome}</p>
                  <p style={{ fontSize: "0.72rem", color: tk.muted, fontFamily: tk.fontMono }}>
                    {FORMATO_LABELS[r.formato]} · {(r.timeline?.tracks?.length ?? 0)} tracks · fonte: {fonte?.nomeOriginal ?? "—"} · {nomePersona(data, r.personaId)}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setEditando(r)}>Editar</Button>
                <Button variant="ghost" onClick={() => enfileirar(r)} disabled={!r.fonteVideoId}>Enfileirar</Button>
                <Button variant="danger" onClick={() => excluir(r)}>Excluir</Button>
              </div>
            )
          })}
        </div>
      )}

      {(novo || editando) && (
        <RoteiroEditor
          data={data}
          roteiro={editando}
          onClose={() => { setNovo(false); setEditando(null) }}
          onSaved={() => { setNovo(false); setEditando(null); router.refresh() }}
        />
      )}
    </Surface>
  )
}

function RoteiroEditor({
  data, roteiro, onClose, onSaved,
}: {
  data: EstudioData
  roteiro: RoteiroLite | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(roteiro?.nome ?? "")
  const [personaId, setPersonaId] = useState(roteiro?.personaId ?? "")
  const [formato, setFormato] = useState<FormatoId>(roteiro?.formato ?? "VERTICAL_9_16")
  const [fonteVideoId, setFonteVideoId] = useState(roteiro?.fonteVideoId ?? "")
  const [templateVideoId, setTemplateVideoId] = useState(roteiro?.templateVideoId ?? "")
  const [tracks, setTracks] = useState<TrackDraft[]>(
    (roteiro?.timeline?.tracks as TrackDraft[]) ?? [
      { tipo: "texto", inicio: 0, fim: 3, conteudo: "REBELDE POR NATUREZA", estilo: "impacto", animacao: "write-on", posicao: "safe-center" },
    ]
  )
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const timelineForPreview = useMemo<Timeline>(() => ({ tracks: tracks as unknown as Timeline["tracks"] }), [tracks])

  function updateTrack(i: number, patch: Partial<TrackDraft>) {
    setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  function addTrack(tipo: "texto" | "asset") {
    setTracks((prev) => [
      ...prev,
      tipo === "texto"
        ? { tipo, inicio: 0, fim: 3, conteudo: "", estilo: "impacto", animacao: "write-on", posicao: "safe-center" }
        : { tipo, inicio: 0, fim: 3, assetTag: data.assets[0]?.tag ?? "", animacao: "fade", posicao: "safe-center" },
    ])
  }
  function removeTrack(i: number) {
    setTracks((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function salvar() {
    setErro(null); setSalvando(true)
    const payload = {
      nome,
      personaId: personaId || null,
      formato,
      fonteVideoId: fonteVideoId || null,
      templateVideoId: templateVideoId || null,
      timeline: { tracks },
    }
    const url = roteiro ? `/api/estudio/roteiros/${roteiro.id}` : "/api/estudio/roteiros"
    const res = await fetch(url, {
      method: roteiro ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSalvando(false)
    if (res.ok) return onSaved()
    const e = await res.json().catch(() => ({}))
    setErro(e.detalhes?.join(" · ") || (typeof e.error === "string" ? e.error : "Falha ao salvar."))
  }

  return (
    <Modal open onClose={onClose} maxWidth="60rem">
      <ModalHeader title={roteiro ? "Editar roteiro" : "Novo roteiro"} onClose={onClose} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--space-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", minWidth: 0 }}>
          <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Gancho incongruência — batch 01" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-sm)" }}>
            <Field label="Persona">
              <Select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                <option value="">— (nenhuma)</option>
                {data.personas.map((p) => <option key={p.id} value={p.id}>{p.nomeArtistico}</option>)}
              </Select>
            </Field>
            <Field label="Formato">
              <Select value={formato} onChange={(e) => setFormato(e.target.value as FormatoId)}>
                {FORMATOS.map((f) => <option key={f} value={f}>{FORMATO_LABELS[f]}</option>)}
              </Select>
            </Field>
            <Field label="Fonte de vídeo">
              <Select value={fonteVideoId} onChange={(e) => setFonteVideoId(e.target.value)}>
                <option value="">— (defina para renderizar)</option>
                {data.fontes.map((f) => <option key={f.id} value={f.id}>{f.nomeOriginal} ({f.duracaoSeg}s)</option>)}
              </Select>
            </Field>
            <Field label="Template">
              <Select value={templateVideoId} onChange={(e) => setTemplateVideoId(e.target.value)}>
                <option value="">— (gancho-incongruencia)</option>
                {data.templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-xs)" }}>
            <span className="ce-label">Timeline (tracks)</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="ghost" onClick={() => addTrack("texto")}>+ Texto</Button>
              <Button variant="ghost" onClick={() => addTrack("asset")}>+ Asset</Button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {tracks.map((t, i) => (
              <div key={i} style={{ border: `1px solid ${tk.border}`, borderRadius: tk.radius, padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: "0.72rem", fontFamily: tk.fontMono, color: tk.muted, textTransform: "uppercase" }}>{t.tipo}</strong>
                  <span style={{ flex: 1 }} />
                  <label style={miniLabel}>início<input type="number" step={0.1} min={0} value={t.inicio} onChange={(e) => updateTrack(i, { inicio: Number(e.target.value) })} style={miniInput} /></label>
                  <label style={miniLabel}>fim<input type="number" step={0.1} min={0} value={t.fim} onChange={(e) => updateTrack(i, { fim: Number(e.target.value) })} style={miniInput} /></label>
                  <button type="button" onClick={() => removeTrack(i)} style={{ color: tk.danger, background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {t.tipo === "texto" ? (
                    <>
                      <input value={t.conteudo ?? ""} onChange={(e) => updateTrack(i, { conteudo: e.target.value })} placeholder="texto" className="ce-input" style={{ gridColumn: "1 / -1" }} />
                      <Select value={t.estilo} onChange={(e) => updateTrack(i, { estilo: e.target.value as TrackDraft["estilo"] })}>
                        {ESTILOS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </>
                  ) : (
                    <Select value={t.assetTag} onChange={(e) => updateTrack(i, { assetTag: e.target.value })}>
                      <option value="">— tag —</option>
                      {data.assets.map((a) => <option key={a.id} value={a.tag}>{a.tag}</option>)}
                    </Select>
                  )}
                  <Select value={t.animacao} onChange={(e) => updateTrack(i, { animacao: e.target.value as TrackDraft["animacao"] })}>
                    {ANIMACOES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </Select>
                  <Select value={t.posicao} onChange={(e) => updateTrack(i, { posicao: e.target.value as TrackDraft["posicao"] })}>
                    {POSICOES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {erro && <FormError>{erro}</FormError>}
          <FormActions>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !nome}>{salvando ? "Salvando…" : "Salvar"}</Button>
          </FormActions>
        </div>

        <div>
          <span className="ce-label">Preview (rascunho)</span>
          <RoteiroPreview timeline={timelineForPreview} formato={formato} />
        </div>
      </div>
    </Modal>
  )
}

// ─── FONTES ──────────────────────────────────────────────────────────────────
function FontesTab({ fontes, personas }: { fontes: FonteLite[]; personas: EstudioData["personas"] }) {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function escanear() {
    setBusy(true); setMsg(null)
    const res = await fetch("/api/estudio/fontes/scan", { method: "POST" })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    setMsg(res.ok ? `${j.registrados} nova(s) fonte(s) registrada(s).${j.ignorados?.length ? ` Ignoradas: ${j.ignorados.length}.` : ""}` : (j.error || "Erro ao escanear."))
    if (res.ok) router.refresh()
  }

  async function upload(file: File) {
    setBusy(true); setMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/estudio/fontes", { method: "POST", body: fd })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    setMsg(res.ok ? `Enviado: ${j.nomeOriginal}` : (j.error || "Erro no upload."))
    if (res.ok) router.refresh()
  }

  return (
    <Surface>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <SectionTitle>Fontes de vídeo</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={escanear} disabled={busy}>Escanear pasta</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>Upload</Button>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>
      {msg && <p style={{ color: tk.muted, fontSize: "0.8rem", marginBottom: "var(--space-sm)" }}>{msg}</p>}
      <p style={{ color: tk.faint, fontSize: "0.72rem", fontFamily: tk.fontMono, marginBottom: "var(--space-sm)" }}>
        Inbox: {"{ESTUDIO_DATA_DIR}"}/fontes — solte os clipes lá e clique em “Escanear pasta”.
      </p>

      {fontes.length === 0 ? (
        <EmptyState>Nenhuma fonte. Solte vídeos na pasta e escaneie, ou envie por upload.</EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {fontes.map((f) => (
            <div key={f.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{f.nomeOriginal}</p>
                <p style={{ fontSize: "0.72rem", color: tk.muted, fontFamily: tk.fontMono }}>
                  {f.duracaoSeg}s · {f.largura}×{f.altura} · {f.fps}fps · {f.origem}
                  {f.personaId ? ` · ${personas.find((p) => p.id === f.personaId)?.nomeArtistico ?? f.personaId}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  )
}

// ─── JOBS ────────────────────────────────────────────────────────────────────
function JobsTab({ data }: { data: EstudioData }) {
  const router = useRouter()
  return (
    <Surface>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <SectionTitle>Jobs de render</SectionTitle>
        <Button variant="ghost" onClick={() => router.refresh()}>Atualizar</Button>
      </div>
      {data.jobs.length === 0 ? (
        <EmptyState>Nenhum job. Enfileire um render a partir de um roteiro.</EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.jobs.map((j) => (
            <div key={j.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{j.roteiro?.nome ?? "—"}</p>
                <p style={{ fontSize: "0.72rem", color: tk.muted, fontFamily: tk.fontMono }}>
                  {FORMATO_LABELS[j.formato]} · {new Date(j.createdAt).toLocaleString("pt-BR")}
                  {j.outputPath ? ` · ${j.outputPath}` : ""}
                  {j.erro ? ` · ${j.erro}` : ""}
                </p>
              </div>
              <span style={{
                fontFamily: tk.fontMono, fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
                color: STATUS_COR[j.status], padding: "0.15rem 0.55rem", borderRadius: tk.radius,
                background: `color-mix(in oklch, ${STATUS_COR[j.status]} 14%, transparent)`,
                border: `1px solid color-mix(in oklch, ${STATUS_COR[j.status]} 35%, transparent)`,
              }}>{STATUS_LABEL[j.status]}</span>
            </div>
          ))}
        </div>
      )}
    </Surface>
  )
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────
function TemplatesTab({ templates }: { templates: EstudioData["templates"] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState("")
  const [nome, setNome] = useState("")
  const [composicao, setComposicao] = useState("gancho-incongruencia")
  const [descricao, setDescricao] = useState("")
  const [formatos, setFormatos] = useState<FormatoId[]>(["VERTICAL_9_16"])
  const [erro, setErro] = useState<string | null>(null)

  function toggleFormato(f: FormatoId) {
    setFormatos((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }
  async function salvar() {
    setErro(null)
    const res = await fetch("/api/estudio/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, nome, composicao, descricao: descricao || null, formatos }),
    })
    if (res.ok) { setOpen(false); router.refresh() }
    else { const e = await res.json().catch(() => ({})); setErro(typeof e.error === "string" ? e.error : "Falha ao salvar.") }
  }

  return (
    <Surface>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <SectionTitle>Templates (biblioteca)</SectionTitle>
        <Button onClick={() => setOpen(true)}>+ Registrar template</Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState>Nenhum template registrado. Registre o <code>gancho-incongruencia</code> (composição Remotion incluída).</EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {templates.map((t) => (
            <div key={t.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{t.nome} {!t.ativo && <span style={{ color: tk.faint }}>(inativo)</span>}</p>
                <p style={{ fontSize: "0.72rem", color: tk.muted, fontFamily: tk.fontMono }}>
                  {t.slug} · comp: {t.composicao} · {t.formatos.map((f) => FORMATO_LABELS[f]).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Registrar template" onClose={() => setOpen(false)} />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Slug"><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="gancho-incongruencia" /></Field>
          <Field label="Composição Remotion (id)"><Input value={composicao} onChange={(e) => setComposicao(e.target.value)} /></Field>
          <Field label="Descrição"><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
          <div>
            <span className="ce-label">Formatos</span>
            <div style={{ display: "flex", gap: 10 }}>
              {FORMATOS.map((f) => (
                <label key={f} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: "0.8rem" }}>
                  <input type="checkbox" checked={formatos.includes(f)} onChange={() => toggleFormato(f)} />{FORMATO_LABELS[f]}
                </label>
              ))}
            </div>
          </div>
          {erro && <FormError>{erro}</FormError>}
          <FormActions>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!nome || !slug}>Salvar</Button>
          </FormActions>
        </div>
      </Modal>
    </Surface>
  )
}

// ─── ASSETS ──────────────────────────────────────────────────────────────────
function AssetsTab({ assets }: { assets: EstudioData["assets"] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tag, setTag] = useState("")
  const [nome, setNome] = useState("")
  const [tipo, setTipo] = useState("imagem")
  const [arquivo, setArquivo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setErro(null)
    const res = await fetch("/api/estudio/assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, nome, tipo, arquivo, descricao: descricao || null }),
    })
    if (res.ok) { setOpen(false); router.refresh() }
    else { const e = await res.json().catch(() => ({})); setErro(typeof e.error === "string" ? e.error : "Falha ao salvar.") }
  }

  return (
    <Surface>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <SectionTitle>Assets com tag</SectionTitle>
        <Button onClick={() => setOpen(true)}>+ Novo asset</Button>
      </div>
      {assets.length === 0 ? (
        <EmptyState>Nenhum asset. Cadastre overlays/molduras/lockups com uma tag para referenciá-los nos roteiros.</EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {assets.map((a) => (
            <div key={a.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{a.nome} <code style={{ color: tk.gold }}>{a.tag}</code></p>
                <p style={{ fontSize: "0.72rem", color: tk.muted, fontFamily: tk.fontMono }}>{a.tipo} · {a.arquivo}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Novo asset" onClose={() => setOpen(false)} />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <Field label="Tag (única, minúsculas/hífens)"><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="moldura-tatica" /></Field>
          <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="imagem">imagem</option>
              <option value="overlay">overlay</option>
              <option value="lockup">lockup</option>
              <option value="cta">cta</option>
            </Select>
          </Field>
          <Field label="Arquivo (nome em {ESTUDIO_DATA_DIR}/assets)"><Input value={arquivo} onChange={(e) => setArquivo(e.target.value)} placeholder="moldura.png" /></Field>
          <Field label="Descrição"><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
          {erro && <FormError>{erro}</FormError>}
          <FormActions>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!tag || !nome || !arquivo}>Salvar</Button>
          </FormActions>
        </div>
      </Modal>
    </Surface>
  )
}

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  border: `1px solid ${tk.border}`, borderRadius: "var(--radius)", padding: "10px 12px",
}
const miniLabel: React.CSSProperties = { display: "flex", flexDirection: "column", fontSize: "0.6rem", color: tk.faint, gap: 2 }
const miniInput: React.CSSProperties = { width: 60, background: "var(--surface-raised)", border: `1px solid ${tk.border}`, borderRadius: 4, color: tk.fg, padding: "2px 4px", fontFamily: "var(--font-mono)" }
