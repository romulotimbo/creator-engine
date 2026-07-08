/**
 * Carregamento das fontes da identidade Tactical Rebel via @remotion/google-fonts.
 * Todas OFL (SIL Open Font License) — uso livre para render server-side.
 *
 * Impacto ("O Soco"): Bebas Neue (primária) / Anton (alternativa) — caixa alta.
 * Convicção ("A Mente"): Cinzel (primária) / Cormorant Garamond (alt) — itálico.
 *
 * Se preferir builds 100% reprodutíveis/offline, troque por @remotion/fonts
 * apontando para .ttf em brand/fonts/ (ver docs/Guia_Linha_Editorial_Tactical_Rebel.md).
 */
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue"
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton"
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel"
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond"

// Limita pesos/subsets para render rápido e sem "too many requests".
const opts = { subsets: ["latin"] as const, ignoreTooManyRequestsWarning: true }
const bebas = loadBebasNeue("normal", { ...opts, weights: ["400"] })
const anton = loadAnton("normal", { ...opts, weights: ["400"] })
const cinzel = loadCinzel("normal", { ...opts, weights: ["600", "700"] })
const cormorant = loadCormorant("italic", { ...opts, weights: ["600"] })

export const FONT_FAMILIES = {
  impacto: bebas.fontFamily,
  impactoAlt: anton.fontFamily,
  conviccao: cinzel.fontFamily,
  conviccaoAlt: cormorant.fontFamily,
} as const
