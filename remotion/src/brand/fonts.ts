/**
 * Fontes da identidade Tactical Rebel via @remotion/google-fonts.
 * Todas OFL (SIL Open Font License) — uso livre para render server-side.
 *
 * Impacto ("O Soco"): Oswald (grotesca condensada industrial, caixa alta).
 *   Alternativa mais "gritada": Bebas Neue.
 * Convicção ("A Mente"): Spectral itálico (serifa de contraste, itálico REAL —
 *   ao contrário de Cinzel, que só tem romano e forçava um oblíquo sintético feio).
 *
 * Pesos/subsets limitados = render rápido e sem "too many requests".
 */
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald"
import { loadFont as loadSpectral } from "@remotion/google-fonts/Spectral"
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue"

const base = { ignoreTooManyRequestsWarning: true }

const oswald = loadOswald("normal", { ...base, subsets: ["latin"], weights: ["500", "600", "700"] })
const bebas = loadBebasNeue("normal", { ...base, subsets: ["latin"], weights: ["400"] })
const spectralItalico = loadSpectral("italic", { ...base, subsets: ["latin"], weights: ["500", "600"] })
const spectralRomano = loadSpectral("normal", { ...base, subsets: ["latin"], weights: ["600"] })

export const FONT_FAMILIES = {
  impacto: oswald.fontFamily,
  impactoAlt: bebas.fontFamily,
  conviccao: spectralItalico.fontFamily,
  conviccaoAlt: spectralRomano.fontFamily,
} as const
