/**
 * Contrato do "roteiro de estilização" — timeline parametrizada.
 * Fonte ÚNICA da forma do dado trocado entre UI, API, preview e worker de render.
 *
 * Depende apenas de `zod` e dos tokens de marca (portável entre app e Remotion).
 * Componentes Remotion devem importar TIPOS daqui com `import type` para não
 * puxar o zod para o bundle da composição.
 */
import { z } from "zod"
import { FORMATOS, type FormatoId } from "../../../brand/tokens"

export const ESTILOS_TEXTO = ["impacto", "conviccao", "cta"] as const
export const ANIMACOES_IDS = [
  "write-on",
  "corte-seco",
  "fade",
  "cascata",
  "kick",
  "mask-wipe",
  "blur-in",
] as const
export const POSICOES = ["safe-top", "safe-center", "safe-bottom", "safe-bottom-alt", "safe-baked-text"] as const

const intervalo = {
  inicio: z.number().min(0, "início não pode ser negativo"),
  fim: z.number().positive("fim deve ser positivo"),
}

// Nota: membros de `discriminatedUnion` (zod v3) precisam ser ZodObject puros —
// sem `.refine()`. A regra fim > início é aplicada em `validarTimeline`.
const trackTextoSchema = z.object({
  tipo: z.literal("texto"),
  ...intervalo,
  conteudo: z.string().min(1, "texto não pode ser vazio"),
  estilo: z.enum(ESTILOS_TEXTO),
  animacao: z.enum(ANIMACOES_IDS).default("corte-seco"),
  posicao: z.enum(POSICOES).default("safe-center"),
  /** Placa de contraste sólida atrás do texto (footage claro/ruidoso). */
  placa: z.boolean().optional(),
  assetTag: z.null().optional(),
})

const trackAssetSchema = z.object({
  tipo: z.literal("asset"),
  ...intervalo,
  assetTag: z.string().min(1, "assetTag é obrigatória"),
  animacao: z.enum(ANIMACOES_IDS).default("fade"),
  posicao: z.enum(POSICOES).default("safe-center"),
})

export const trackSchema = z.discriminatedUnion("tipo", [trackTextoSchema, trackAssetSchema])

export const timelineSchema = z.object({
  /** @handle opcional para marca d'água / CTA (ex.: "veesemfiltro"). */
  handle: z.string().trim().max(40).optional(),
  tracks: z.array(trackSchema).min(1, "o roteiro precisa de ao menos uma track"),
})

export type Track = z.infer<typeof trackSchema>
export type TrackTexto = z.infer<typeof trackTextoSchema>
export type TrackAsset = z.infer<typeof trackAssetSchema>
export type Timeline = z.infer<typeof timelineSchema>

export interface ValidacaoOpts {
  /** Duração da fonte em segundos — tracks não podem ultrapassá-la. */
  duracaoFonteSeg?: number
  /** Tags de assets existentes na biblioteca — asset tracks devem referenciá-las. */
  tagsDisponiveis?: string[]
}

export interface ValidacaoResultado {
  ok: boolean
  data?: Timeline
  erros: string[]
}

/**
 * Valida um roteiro (forma + regras de negócio contra a fonte e a biblioteca).
 * Regras: intervalos ⊆ duração da fonte; assetTag existente; estilo ∈ hierarquia
 * (garantido pelo enum do zod).
 */
export function validarTimeline(raw: unknown, opts: ValidacaoOpts = {}): ValidacaoResultado {
  const parsed = timelineSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      erros: parsed.error.issues.map((i) => `${i.path.join(".") || "timeline"}: ${i.message}`),
    }
  }

  const erros: string[] = []
  const { duracaoFonteSeg, tagsDisponiveis } = opts

  parsed.data.tracks.forEach((t, idx) => {
    if (t.fim <= t.inicio) {
      erros.push(`track ${idx + 1}: fim (${t.fim}s) deve ser maior que início (${t.inicio}s)`)
    }
    if (typeof duracaoFonteSeg === "number" && duracaoFonteSeg > 0 && t.fim > duracaoFonteSeg + 0.001) {
      erros.push(
        `track ${idx + 1}: intervalo [${t.inicio}s–${t.fim}s] excede a duração da fonte (${duracaoFonteSeg}s)`
      )
    }
    if (t.tipo === "asset" && tagsDisponiveis && !tagsDisponiveis.includes(t.assetTag)) {
      erros.push(`track ${idx + 1}: assetTag "${t.assetTag}" não existe na biblioteca`)
    }
  })

  if (erros.length > 0) return { ok: false, erros }
  return { ok: true, data: parsed.data, erros: [] }
}

// ─── Adaptador: roteiro (segundos) → props de composição (frames) ────────────

export interface TrackProps {
  tipo: "texto" | "asset"
  inicioFrame: number
  fimFrame: number
  animacao: (typeof ANIMACOES_IDS)[number]
  posicao: (typeof POSICOES)[number]
  conteudo?: string
  estilo?: (typeof ESTILOS_TEXTO)[number]
  placa?: boolean
  assetTag?: string | null
}

export interface CompositionProps {
  formato: FormatoId
  width: number
  height: number
  fps: number
  /** Duração total em frames — worker sobrescreve com a duração real da fonte. */
  durationInFrames: number
  fonteVideoSrc?: string
  /** Imagem estática de fundo (overlay de texto em still). */
  fonteImagemSrc?: string
  /** Modo overlay em foto: sem moldura, scrim, grão ou marca d'água. */
  overlayImagem?: boolean
  /** Mapa tag→URL do asset, resolvido pelo worker antes do render. */
  assets?: Record<string, string>
  /** @handle para marca d'água / CTA (sem o "@"). */
  handle?: string
  tracks: TrackProps[]
}

export function segundosParaFrames(segundos: number, fps: number): number {
  return Math.round(segundos * fps)
}

/**
 * Converte o roteiro validado em props prontas para a composição Remotion.
 * `formatoId` vem da RoteiroEstilizacao (fonte da verdade do formato).
 */
export function timelineParaProps(
  timeline: Timeline,
  formatoId: FormatoId,
  extras: {
    fonteVideoSrc?: string
    fonteImagemSrc?: string
    assets?: Record<string, string>
    overlayImagem?: boolean
  } = {}
): CompositionProps {
  const fmt = FORMATOS[formatoId]
  const tracks: TrackProps[] = timeline.tracks.map((t) => ({
    tipo: t.tipo,
    inicioFrame: segundosParaFrames(t.inicio, fmt.fps),
    fimFrame: segundosParaFrames(t.fim, fmt.fps),
    animacao: t.animacao,
    posicao: t.posicao,
    conteudo: t.tipo === "texto" ? t.conteudo : undefined,
    estilo: t.tipo === "texto" ? t.estilo : undefined,
    placa: t.tipo === "texto" ? t.placa : undefined,
    assetTag: t.tipo === "asset" ? t.assetTag : undefined,
  }))

  const maxFim = tracks.reduce((m, t) => Math.max(m, t.fimFrame), 0)

  return {
    formato: formatoId,
    width: fmt.width,
    height: fmt.height,
    fps: fmt.fps,
    // fallback quando a duração da fonte não é conhecida; worker sobrescreve.
    durationInFrames: Math.max(maxFim + fmt.fps, fmt.fps),
    fonteVideoSrc: extras.fonteVideoSrc,
    fonteImagemSrc: extras.fonteImagemSrc,
    overlayImagem: extras.overlayImagem,
    assets: extras.assets,
    handle: timeline.handle,
    tracks,
  }
}
