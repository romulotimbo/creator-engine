/**
 * Brand kit — Tactical Rebel (persona veesemfiltro)
 * Fonte ÚNICA de tokens visuais da esteira de estilização de vídeo.
 * Derivado de docs/Guia_Linha_Editorial_Tactical_Rebel.md.
 *
 * Conceito: "decreto carimbado encontra estêncil de rua" — punch industrial
 * (impacto) + serifa de contraste com itálico real (convicção), unidos pelo ouro.
 * Paleta fiel ao guia (preto/branco/ouro) com profundidade de material.
 *
 * Importado por:
 *  - remotion/ (composições e componentes de marca)
 *  - src/   (preview/rascunho no Creator Engine, labels de UI)
 *
 * Sem dependências: mantém-se portável entre a app Next e a workspace Remotion.
 */

// ─── Cores táticas ───────────────────────────────────────────────────────────
export const COLORS = {
  /** Preto profundo do guia — mantido para compatibilidade. */
  pretoProfundo: "#000000",
  /** Canvas near-black levemente frio (evita o #000 chapado quando não há vídeo). */
  tinta: "#0A0A0B",
  /** Branco gelo — texto principal de impacto ("O Soco"). */
  brancoGelo: "#F2F2F2",
  /** Branco puro — brilho pontual (filetes, realces). */
  brancoPuro: "#FFFFFF",
  /** Dourado envelhecido — palavra de ordem / encerramento provocador. */
  douradoEnvelhecido: "#C5A059",
  /** Realce do ouro (sheen de material em filetes/marcas — nunca em texto). */
  douradoLuz: "#E7CE93",
  /** Sombra do ouro (base do gradiente de material). */
  douradoSombra: "#8A6D34",
  /** Scrim base do guia — mantido para compatibilidade. */
  scrim: "rgba(0,0,0,0.45)",
  /** Scrim mais forte para zonas de texto densas. */
  scrimForte: "rgba(0,0,0,0.66)",
} as const

/** Gradiente de material do ouro (para filetes/marcas — NUNCA em texto). */
export const OURO_MATERIAL =
  `linear-gradient(90deg, ${COLORS.douradoSombra} 0%, ${COLORS.douradoEnvelhecido} 45%, ${COLORS.douradoLuz} 100%)`

/**
 * Scrim de cena (Pilar 1 — Atração): protege topo e base, mantém o miolo
 * (rosto/sujeito) limpo. Duplo gradiente.
 */
export const SCRIM_CENA =
  "linear-gradient(180deg," +
  " rgba(0,0,0,0.58) 0%," +
  " rgba(0,0,0,0.10) 22%," +
  " rgba(0,0,0,0.00) 46%," +
  " rgba(0,0,0,0.06) 60%," +
  " rgba(0,0,0,0.74) 100%)"

/** Scrim inferior (Pilar 2 — Bastidores): topo quase limpo, base forte p/ legenda. */
export const SCRIM_INFERIOR =
  "linear-gradient(180deg," +
  " rgba(0,0,0,0.30) 0%," +
  " rgba(0,0,0,0.00) 30%," +
  " rgba(0,0,0,0.04) 55%," +
  " rgba(0,0,0,0.84) 100%)"

/** Scrim low-key (Pilar 3 — Provocação): mistério, escurece o conjunto todo. */
export const SCRIM_LOWKEY =
  "linear-gradient(180deg," +
  " rgba(0,0,0,0.60) 0%," +
  " rgba(0,0,0,0.34) 38%," +
  " rgba(0,0,0,0.44) 66%," +
  " rgba(0,0,0,0.88) 100%)"

/** Vinheta cinematográfica sutil (escurece cantos, foca o centro). */
export const VINHETA =
  "radial-gradient(120% 100% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.34) 100%)"

/** Vinheta forte (low-key / provocação) — cerca mais o sujeito. */
export const VINHETA_FORTE =
  "radial-gradient(110% 92% at 50% 44%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.55) 100%)"

// ─── Tipografia e hierarquia ─────────────────────────────────────────────────
/**
 * Impacto ("O Soco") — Oswald, caixa alta, branco gelo, tracking de pôster.
 * Convicção ("A Mente") — Spectral itálico, dourado, ~56% do impacto, com filete.
 *
 * `escalaBase` = fração da largura do formato usada como tamanho-base; o
 * componente aplica auto-fit (reduz até caber na safe zone) para nunca transbordar.
 * `avgAdvance` = largura média do glifo em relação ao fontSize (estimativa de fit).
 */
export const TYPOGRAPHY = {
  impacto: {
    fontFamily: "Oswald",
    fontFamilyAlt: "Bebas Neue",
    color: COLORS.brancoGelo,
    textTransform: "uppercase" as const,
    fontWeight: 700,
    letterSpacing: "0.045em",
    lineHeight: 0.98,
    escalaBase: 0.125,
    tamanhoMin: 52,
    avgAdvance: 0.58,
  },
  conviccao: {
    fontFamily: "Spectral",
    fontFamilyAlt: "Spectral",
    color: COLORS.douradoEnvelhecido,
    fontStyle: "italic" as const,
    fontWeight: 600,
    letterSpacing: "0.005em",
    /** 56% do impacto (mantém o campo `scale` histórico). */
    scale: 0.56,
    lineHeight: 1.16,
    escalaBase: 0.072,
    tamanhoMin: 34,
    avgAdvance: 0.5,
  },
  /** CTA ("A Ordem") — Oswald pequeno, hiper-tracked, chamada de conversão. */
  cta: {
    fontFamily: "Oswald",
    fontFamilyAlt: "Bebas Neue",
    color: COLORS.brancoGelo,
    textTransform: "uppercase" as const,
    fontWeight: 600,
    letterSpacing: "0.24em",
    lineHeight: 1.0,
    escalaBase: 0.05,
    tamanhoMin: 26,
    avgAdvance: 0.66,
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

// ─── Auto-fit tipográfico ────────────────────────────────────────────────────
/**
 * Calcula um fontSize que cabe na largura útil, evitando overflow (proibição
 * absoluta "texto que transborda"). Considera a maior linha (\n) e a maior
 * palavra; nunca ultrapassa `base` nem fica abaixo de `min`.
 */
export function autoFontSize(
  texto: string,
  larguraSafePx: number,
  opts: { base: number; min: number; avgAdvance: number }
): number {
  const linhas = texto.split(/\n/).map((s) => s.trim()).filter(Boolean)
  const maiorLinha = linhas.reduce((m, l) => Math.max(m, l.length), 0) || texto.length
  const palavras = texto.split(/\s+/).filter(Boolean)
  const maiorPalavra = palavras.reduce((m, w) => Math.max(m, w.length), 0) || maiorLinha
  // Se há quebras explícitas, respeita-as; senão assume um wrap confortável.
  const alvo = linhas.length > 1 ? maiorLinha : Math.max(maiorPalavra, Math.min(maiorLinha, 14))
  const cabe = larguraSafePx / Math.max(1, alvo * opts.avgAdvance)
  return Math.max(opts.min, Math.min(opts.base, Math.floor(cabe)))
}

/** Largura útil de texto (safe zone menos um respiro interno). */
export function larguraTexto(fmt: FormatoSpec, respiro = 24): number {
  return fmt.width - fmt.safe.sideMargin * 2 - respiro * 2
}

// ─── Tokens de animação ──────────────────────────────────────────────────────
/**
 * write-on: revelação do impacto (clip da esquerda→direita) + tracking que assenta.
 * corte-seco: carimbo instantâneo (leve punch de escala) sincronizável ao beat.
 * fade: entrada suave (assets/overlays) com leve subida.
 */
export const ANIMACOES = {
  /** Revelação do impacto (clip esquerda→direita) + tracking que assenta. */
  "write-on": { durationFrames: 14, easing: "out-expo" as const },
  /** Carimbo instantâneo (leve punch de escala) sincronizável ao beat. */
  "corte-seco": { durationFrames: 0, easing: "linear" as const },
  /** Entrada suave (assets/overlays) com leve subida. */
  fade: { durationFrames: 14, easing: "out-quart" as const },
  /** Palavra-a-palavra: cada termo entra em sequência (o "soco" ritmado). */
  cascata: { durationFrames: 8, easing: "out-expo" as const },
  /** Soco no beat: punch de escala forte e curto (sem bounce). */
  kick: { durationFrames: 8, easing: "out-expo" as const },
  /** Revelação diagonal com máscara (mais "tática" que o fade). */
  "mask-wipe": { durationFrames: 16, easing: "out-quint" as const },
  /** Entra desfocada e foca — dá gravidade à convicção. */
  "blur-in": { durationFrames: 18, easing: "out-quart" as const },
} as const

export type AnimacaoId = keyof typeof ANIMACOES

/** Atraso (frames) entre palavras na animação `cascata`. */
export const CASCATA_STAGGER = 3

/** Saída padrão de qualquer track (fade + leve subida nos últimos frames). */
export const SAIDA = { durationFrames: 10, easing: "out-quart" as const }

/** Filete dourado ("assinatura" da convicção): desenha da esquerda p/ direita. */
export const SUBLINHADO = { durationFrames: 18, easing: "out-expo" as const, atrasoFrames: 4 }

/** Marcas de registro (cantos táticos) que substituem a moldura genérica. */
export const REGISTRO = { tamanho: 46, espessura: 2, margem: 46, opacidade: 0.42 }

export const EASINGS: Record<string, [number, number, number, number]> = {
  "out-expo": [0.16, 1, 0.3, 1],
  "out-quart": [0.25, 1, 0.5, 1],
  "out-quint": [0.22, 1, 0.36, 1],
  linear: [0, 0, 1, 1],
}

/** Grão de filme cinematográfico (não "textura de papel"): monocromático,
 *  animado e em blend overlay a baixa opacidade — reforça a estética analógica. */
export const GRAO = { baseFrequency: 0.9, octaves: 2, blend: "overlay" as const }

/** Marca d'água / @handle — reconhecimento e anti-repost, discreta. */
export const HANDLE = { opacidade: 0.5, letterSpacing: "0.18em", escala: 0.026 }

/** Placa de contraste (garante 4.5:1 sobre footage claro/ruidoso). */
export const PLACA = { fundo: "rgba(0,0,0,0.62)", padY: 0.34, padX: 0.7, raio: 4 }

/**
 * Faixa em modo overlay-imagem: cobre só o bloco de legenda baked (~2 linhas).
 * Calibrado para texto no terço inferior (≈77%–85% do topo em 9:16).
 */
export const COBERTURA_TEXTO_BAKED = {
  bottomOffsetRatio: 0.135,
  alturaRatio: 0.099,
  larguraRatio: 0.72,
  fadeInternoRatio: 0.08,
} as const

// ─── Posições nomeadas (mapeadas para a safe zone do formato) ────────────────
export type PosicaoId = "safe-top" | "safe-center" | "safe-bottom" | "safe-bottom-alt" | "safe-baked-text"

// ─── Presets por pilar (fábrica de Reels/Stories) ────────────────────────────
/**
 * Cada preset mapeia 1:1 para uma composição Remotion (worker seleciona por
 * `TemplateVideo.composicao`). Define o "clima" da cena — scrim, grão, vinheta
 * e default de marca d'água — sem tocar nas tracks parametrizadas pelo roteiro.
 */
export type PresetId = "gancho" | "bastidores" | "provocacao"

export interface PresetSpec {
  id: PresetId
  composicao: string
  label: string
  descricao: string
  scrim: "cena" | "inferior" | "low-key"
  /** Opacidade do grão (0 = desligado). */
  grao: number
  vinhetaForte: boolean
  /** Mostra @handle por padrão (quando o roteiro define `handle`). */
  handlePadrao: boolean
}

export const PRESETS: Record<PresetId, PresetSpec> = {
  gancho: {
    id: "gancho",
    composicao: "gancho-incongruencia",
    label: "Gancho da Incongruência",
    descricao: "Pilar 1 · Atração — choque nos 3s, texto no miolo/base, cena limpa.",
    scrim: "cena",
    grao: 0,
    vinhetaForte: false,
    handlePadrao: false,
  },
  bastidores: {
    id: "bastidores",
    composicao: "bastidores-disciplina",
    label: "Bastidores & Disciplina",
    descricao: "Pilar 2 · Conexão — rotina/treino, legenda em terço inferior, tom acolhedor.",
    scrim: "inferior",
    grao: 0.05,
    vinhetaForte: false,
    handlePadrao: true,
  },
  provocacao: {
    id: "provocacao",
    composicao: "provocacao-conversao",
    label: "Provocação → Conversão",
    descricao: "Pilar 3 · Conversão — low-key, mistério, encerra em CTA (link na bio).",
    scrim: "low-key",
    grao: 0.08,
    vinhetaForte: true,
    handlePadrao: true,
  },
}

export const PRESET_POR_COMPOSICAO: Record<string, PresetId> = {
  "gancho-incongruencia": "gancho",
  "bastidores-disciplina": "bastidores",
  "provocacao-conversao": "provocacao",
}
