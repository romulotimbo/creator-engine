import React from "react"
import { interpolate, Easing, useCurrentFrame } from "remotion"
import {
  COLORS,
  TYPOGRAPHY,
  FORMATOS,
  ANIMACOES,
  EASINGS,
  type FormatoId,
  type EstiloTexto,
  type AnimacaoId,
  type PosicaoId,
} from "../../../brand/tokens"
import { FONT_FAMILIES } from "./fonts"

function easingFn(name: string) {
  const [a, b, c, d] = EASINGS[name] ?? EASINGS.linear
  return Easing.bezier(a, b, c, d)
}

/** Estilo de animação de entrada para o frame local (relativo ao início da track). */
export function useEntradaStyle(animacao: AnimacaoId, localFrame: number): React.CSSProperties {
  const spec = ANIMACOES[animacao]
  if (animacao === "corte-seco" || spec.durationFrames === 0) {
    return { opacity: 1 }
  }
  const ease = easingFn(spec.easing)
  if (animacao === "write-on") {
    const p = interpolate(localFrame, [0, spec.durationFrames], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    })
    return { clipPath: `inset(0 ${100 - p}% 0 0)`, opacity: 1 }
  }
  // fade
  const opacity = interpolate(localFrame, [0, spec.durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })
  const translateY = interpolate(localFrame, [0, spec.durationFrames], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })
  return { opacity, transform: `translateY(${translateY}px)` }
}

const JUSTIFY: Record<PosicaoId, React.CSSProperties["justifyContent"]> = {
  "safe-top": "flex-start",
  "safe-center": "center",
  "safe-bottom": "flex-end",
}

/** Container que respeita a safe zone do formato. */
export const SafeZone: React.FC<{
  formato: FormatoId
  posicao: PosicaoId
  children: React.ReactNode
}> = ({ formato, posicao, children }) => {
  const fmt = FORMATOS[formato]
  return (
    <div
      style={{
        position: "absolute",
        left: fmt.safe.sideMargin,
        right: fmt.safe.sideMargin,
        top: fmt.safe.top,
        height: fmt.safe.bottom - fmt.safe.top,
        display: "flex",
        flexDirection: "column",
        justifyContent: JUSTIFY[posicao],
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  )
}

/** Texto de impacto ("O Soco") — Bebas Neue, branco gelo, caixa alta. */
export const TextoImpacto: React.FC<{
  children: React.ReactNode
  animacao?: AnimacaoId
  localFrame?: number
}> = ({ children, animacao = "write-on", localFrame }) => {
  const frame = useCurrentFrame()
  const lf = localFrame ?? frame
  const style = useEntradaStyle(animacao, lf)
  const t = TYPOGRAPHY.impacto
  return (
    <span
      style={{
        fontFamily: `${FONT_FAMILIES.impacto}, ${t.fontFamily}, sans-serif`,
        color: t.color,
        textTransform: t.textTransform,
        fontWeight: t.fontWeight,
        letterSpacing: t.letterSpacing,
        lineHeight: t.lineHeight,
        fontSize: 96,
        textShadow: "0 4px 24px rgba(0,0,0,0.55)",
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/** Texto de convicção ("A Mente") — Cinzel itálico, dourado, ~40% menor. */
export const TextoConviccao: React.FC<{
  children: React.ReactNode
  animacao?: AnimacaoId
  localFrame?: number
}> = ({ children, animacao = "corte-seco", localFrame }) => {
  const frame = useCurrentFrame()
  const lf = localFrame ?? frame
  const style = useEntradaStyle(animacao, lf)
  const t = TYPOGRAPHY.conviccao
  return (
    <span
      style={{
        fontFamily: `${FONT_FAMILIES.conviccao}, ${t.fontFamily}, serif`,
        color: t.color,
        fontStyle: t.fontStyle,
        fontWeight: t.fontWeight,
        lineHeight: t.lineHeight,
        fontSize: Math.round(96 * t.scale),
        textShadow: "0 4px 20px rgba(0,0,0,0.5)",
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/** Overlay de asset referenciado por tag (resolvido para URL pelo worker). */
export const AssetOverlay: React.FC<{
  src?: string
  animacao?: AnimacaoId
  localFrame?: number
}> = ({ src, animacao = "fade", localFrame }) => {
  const frame = useCurrentFrame()
  const lf = localFrame ?? frame
  const style = useEntradaStyle(animacao, lf)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
        ...style,
      }}
    />
  )
}

/** Scrim sutil para garantir contraste do texto sobre o vídeo. */
export const Scrim: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(to bottom, transparent 40%, ${COLORS.scrim})`,
    }}
  />
)

export { COLORS, TYPOGRAPHY, FORMATOS }
export type { FormatoId, EstiloTexto, AnimacaoId, PosicaoId }
