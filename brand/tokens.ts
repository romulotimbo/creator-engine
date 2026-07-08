/**
 * Brand kit — Tactical Rebel (persona veesemfiltro)
 * Fonte ÚNICA de tokens visuais da esteira de estilização de vídeo.
 * Derivado de docs/Guia_Linha_Editorial_Tactical_Rebel.md.
 *
 * Importado por:
 *  - remotion/ (composições e componentes de marca)
 *  - src/ (preview/rascunho no Creator Engine, labels de UI)
 *
 * Sem dependências: mantém-se portável entre a app Next e a workspace Remotion.
 */

// ─── Cores táticas ───────────────────────────────────────────────────────────
export const COLORS = {
  /** Preto profundo — base para elegância/mistério (cultura alternativa/tattoo) */
  pretoProfundo: "#000000",
  /** Branco gelo — texto principal de impacto, legibilidade máxima */
  brancoGelo: "#F2F2F2",
  /** Dourado envelhecido — toque tradicionalista, palavras de ordem/encerramento */
  douradoEnvelhecido: "#C5A059",
  /** Sombra/scrim sobre o vídeo para garantir contraste do texto */
  scrim: "rgba(0,0,0,0.45)",
} as const

// ─── Tipografia e hierarquia ─────────────────────────────────────────────────
/**
 * Impacto ("O Soco") — caixa alta, branco gelo, write-on rápido.
 * Convicção ("A Mente") — itálico, dourado, ~40% menor que o impacto.
 */
export const TYPOGRAPHY = {
  impacto: {
    /** Fonte primária; alternativa em `fontFamilyAlt` (decisão de PoC visual) */
    fontFamily: "Bebas Neue",
    fontFamilyAlt: "Anton",
    color: COLORS.brancoGelo,
    textTransform: "uppercase" as const,
    fontWeight: 700,
    letterSpacing: "0.02em",
    lineHeight: 1.0,
  },
  conviccao: {
    fontFamily: "Cinzel",
    fontFamilyAlt: "Cormorant Garamond",
    color: COLORS.douradoEnvelhecido,
    fontStyle: "italic" as const,
    fontWeight: 600,
    /** 40% menor que o impacto */
    scale: 0.6,
    lineHeight: 1.1,
  },
} as const

export type EstiloTexto = keyof typeof TYPOGRAPHY // "impacto" | "conviccao"

// ─── Formatos e safe zones ───────────────────────────────────────────────────
export type FormatoId = "VERTICAL_9_16" | "QUADRADO_1_1" | "RETRATO_4_5"

export interface FormatoSpec {
  id: FormatoId
  label: string
  width: number
  height: number
  fps: number
  /** Safe zone vertical (px) — área útil para texto/assets */
  safe: { top: number; bottom: number; sideMargin: number }
}

export const FORMATOS: Record<FormatoId, FormatoSpec> = {
  VERTICAL_9_16: {
    id: "VERTICAL_9_16",
    label: "Stories/Reels 9:16",
    width: 1080,
    height: 1920,
    fps: 30,
    safe: { top: 250, bottom: 1670, sideMargin: 80 },
  },
  QUADRADO_1_1: {
    id: "QUADRADO_1_1",
    label: "Feed 1:1",
    width: 1080,
    height: 1080,
    fps: 30,
    safe: { top: 80, bottom: 1000, sideMargin: 80 },
  },
  RETRATO_4_5: {
    id: "RETRATO_4_5",
    label: "Feed 4:5",
    width: 1080,
    height: 1350,
    fps: 30,
    safe: { top: 80, bottom: 1270, sideMargin: 80 },
  },
}

export const FORMATO_LABELS: Record<FormatoId, string> = {
  VERTICAL_9_16: "9:16 (Stories/Reels)",
  QUADRADO_1_1: "1:1 (Feed)",
  RETRATO_4_5: "4:5 (Feed retrato)",
}

// ─── Tokens de animação ──────────────────────────────────────────────────────
/**
 * write-on: revelação rápida do texto de impacto (0–15 frames a 30fps ≈ 0,5s).
 * corte-seco: aparição instantânea sincronizada com o áudio/beat.
 * fade: entrada suave para assets/overlays.
 */
export const ANIMACOES = {
  "write-on": { durationFrames: 15, easing: "out-expo" as const },
  "corte-seco": { durationFrames: 0, easing: "linear" as const },
  fade: { durationFrames: 12, easing: "out-quart" as const },
} as const

export type AnimacaoId = keyof typeof ANIMACOES

export const EASINGS: Record<string, [number, number, number, number]> = {
  "out-expo": [0.16, 1, 0.3, 1],
  "out-quart": [0.25, 1, 0.5, 1],
  linear: [0, 0, 1, 1],
}

// ─── Posições nomeadas (mapeadas para a safe zone do formato) ────────────────
export type PosicaoId = "safe-top" | "safe-center" | "safe-bottom"
