import React from "react"
import { AbsoluteFill, interpolate, Easing, useCurrentFrame } from "remotion"
import {
  COLORS,
  TYPOGRAPHY,
  FORMATOS,
  ANIMACOES,
  EASINGS,
  SAIDA,
  SUBLINHADO,
  CASCATA_STAGGER,
  OURO_MATERIAL,
  SCRIM_CENA,
  SCRIM_INFERIOR,
  SCRIM_LOWKEY,
  GRAO,
  HANDLE,
  PLACA,
  autoFontSize,
  larguraTexto,
  type FormatoId,
  type EstiloTexto,
  type AnimacaoId,
  type PosicaoId,
} from "../../../brand/tokens"
import { FONT_FAMILIES } from "./fonts"

// Nota: prefers-reduced-motion não se aplica a render server-side (MP4). O
// controle de movimento acontece na escolha da animação por track no roteiro.

function easingFn(name: string) {
  const [a, b, c, d] = EASINGS[name] ?? EASINGS.linear
  return Easing.bezier(a, b, c, d)
}

/** Progresso de entrada 0→1 no frame local. */
function progressoEntrada(localFrame: number, dur: number, easeName: string): number {
  if (dur <= 0) return 1
  return interpolate(localFrame, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easingFn(easeName),
  })
}

/** Opacidade de saída 1→0 nos últimos frames da track (se a duração é conhecida). */
function opacidadeSaida(localFrame: number, durationInFrames?: number): number {
  if (!durationInFrames || durationInFrames <= SAIDA.durationFrames) return 1
  const inicio = durationInFrames - SAIDA.durationFrames
  if (localFrame <= inicio) return 1
  return interpolate(localFrame, [inicio, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easingFn(SAIDA.easing),
  })
}

// ─── Realce de palavra (markup inline *palavra* → ouro) ──────────────────────
type Seg = { text: string; gold: boolean }

/** Divide o texto em segmentos, marcando o que está entre *asteriscos* como ouro. */
function parseRealce(texto: string): Seg[] {
  const out: Seg[] = []
  const re = /\*([^*]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    if (m.index > last) out.push({ text: texto.slice(last, m.index), gold: false })
    out.push({ text: m[1], gold: true })
    last = m.index + m[0].length
  }
  if (last < texto.length) out.push({ text: texto.slice(last), gold: false })
  return out.length ? out : [{ text: texto, gold: false }]
}

/** Texto sem os asteriscos de realce (para medir o auto-fit). */
function textoLimpo(texto: string): string {
  return texto.replace(/\*/g, "")
}

/** Palavras individuais com flag de realce (para a animação cascata). */
function palavrasRealce(texto: string): { w: string; gold: boolean }[] {
  const out: { w: string; gold: boolean }[] = []
  for (const s of parseRealce(texto)) {
    for (const w of s.text.split(/\s+/)) if (w) out.push({ w, gold: s.gold })
  }
  return out
}

/** Renderiza segmentos inline, aplicando a cor de realce aos trechos em ouro. */
function segmentosInline(texto: string, corRealce: string): React.ReactNode {
  return parseRealce(texto).map((s, i) =>
    s.gold ? (
      <span key={i} style={{ color: corRealce }}>
        {s.text}
      </span>
    ) : (
      <React.Fragment key={i}>{s.text}</React.Fragment>
    )
  )
}

function comoTexto(children: React.ReactNode): string {
  return typeof children === "string" ? children : React.Children.toArray(children).join(" ")
}

const JUSTIFY: Record<PosicaoId, React.CSSProperties["justifyContent"]> = {
  "safe-top": "flex-start",
  "safe-center": "center",
  "safe-bottom": "flex-end",
}

/** Aura de contraste local (feathered, sem cara de "card") atrás do texto. */
const AuraContraste: React.FC<{ posicao: PosicaoId }> = ({ posicao }) => {
  const foco = posicao === "safe-top" ? "50% 30%" : posicao === "safe-bottom" ? "50% 70%" : "50% 50%"
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: "-6% -12%",
        background: `radial-gradient(60% 46% at ${foco}, ${COLORS.scrimForte} 0%, rgba(0,0,0,0.28) 46%, rgba(0,0,0,0) 74%)`,
        pointerEvents: "none",
      }}
    />
  )
}

/** Container que respeita a safe zone do formato (com aura de contraste). */
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
      <AuraContraste posicao={posicao} />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          maxWidth: "100%",
          padding: "0 8px",
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Placa de contraste sólida atrás do texto (para footage claro/ruidoso). */
const PlacaFundo: React.FC<{ fontSize: number; children: React.ReactNode }> = ({ fontSize, children }) => (
  <span
    style={{
      display: "inline-block",
      background: PLACA.fundo,
      padding: `${Math.round(fontSize * PLACA.padY)}px ${Math.round(fontSize * PLACA.padX)}px`,
      borderRadius: PLACA.raio,
      backdropFilter: "blur(2px)",
      WebkitBoxDecorationBreak: "clone",
    }}
  >
    {children}
  </span>
)

// ─── Texto de impacto ("O Soco") ─────────────────────────────────────────────
export const TextoImpacto: React.FC<{
  children: React.ReactNode
  formato: FormatoId
  animacao?: AnimacaoId
  localFrame?: number
  durationInFrames?: number
  placa?: boolean
}> = ({ children, formato, animacao = "write-on", localFrame, durationInFrames, placa }) => {
  const frame = useCurrentFrame()
  const lf = localFrame ?? frame
  const t = TYPOGRAPHY.impacto
  const fmt = FORMATOS[formato]
  const raw = textoLimpo(comoTexto(children))
  const fontSize = autoFontSize(raw, larguraTexto(fmt), {
    base: Math.round(fmt.width * t.escalaBase),
    min: t.tamanhoMin,
    avgAdvance: t.avgAdvance,
  })

  const dur = ANIMACOES[animacao].durationFrames
  const p = progressoEntrada(lf, dur, ANIMACOES[animacao].easing)
  const saida = opacidadeSaida(lf, durationInFrames)

  let clipPath: string | undefined
  let letterSpacing: string = t.letterSpacing
  let translateY = (1 - saida) * -14
  let scale = 1
  let opacity = saida
  let filter: string | undefined

  if (animacao === "write-on") {
    clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`
    letterSpacing = `${(0.14 - 0.095 * p).toFixed(4)}em`
    translateY += (1 - p) * 8
  } else if (animacao === "corte-seco") {
    const punch = progressoEntrada(lf, 5, "out-expo")
    scale = 1.06 - 0.06 * punch
  } else if (animacao === "kick") {
    scale = 1 + (1 - p) * 0.16
    opacity = saida * Math.min(1, p * 1.8)
  } else if (animacao === "mask-wipe") {
    const a = (-20 + 140 * p).toFixed(1)
    const b = (-40 + 140 * p).toFixed(1)
    clipPath = `polygon(0% 0%, ${a}% 0%, ${b}% 100%, 0% 100%)`
  } else if (animacao === "blur-in") {
    filter = `blur(${((1 - p) * 12).toFixed(2)}px)`
    opacity = saida * p
  } else if (animacao === "cascata") {
    // A animação vive nas palavras (bloco estático); ver render abaixo.
  } else {
    opacity = saida * p
    translateY += (1 - p) * 18
  }

  const commonStyle: React.CSSProperties = {
    display: "block",
    fontFamily: `"${FONT_FAMILIES.impacto}", "${t.fontFamily}", "${t.fontFamilyAlt}", sans-serif`,
    color: t.color,
    textTransform: t.textTransform,
    fontWeight: t.fontWeight,
    letterSpacing,
    lineHeight: t.lineHeight,
    fontSize,
    maxWidth: "100%",
    textWrap: "balance",
    textShadow: "0 2px 3px rgba(0,0,0,0.85), 0 6px 26px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.9)",
    WebkitBoxDecorationBreak: "clone",
  }

  let corpo: React.ReactNode
  if (animacao === "cascata") {
    const words = palavrasRealce(comoTexto(children))
    corpo = (
      <span style={{ ...commonStyle, opacity: saida }}>
        {words.map((word, i) => {
          const pw = progressoEntrada(lf - i * CASCATA_STAGGER, ANIMACOES.cascata.durationFrames, ANIMACOES.cascata.easing)
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                color: word.gold ? COLORS.douradoEnvelhecido : undefined,
                opacity: pw,
                transform: `translateY(${((1 - pw) * 14).toFixed(2)}px)`,
              }}
            >
              {word.w}
            </span>
          )
        })}
      </span>
    )
  } else {
    corpo = (
      <span
        style={{
          ...commonStyle,
          transform: `translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
          opacity,
          clipPath,
          filter,
        }}
      >
        {segmentosInline(comoTexto(children), COLORS.douradoEnvelhecido)}
      </span>
    )
  }

  return placa ? <PlacaFundo fontSize={fontSize}>{corpo}</PlacaFundo> : corpo
}

// ─── Texto de convicção ("A Mente") ──────────────────────────────────────────
export const TextoConviccao: React.FC<{
  children: React.ReactNode
  formato: FormatoId
  animacao?: AnimacaoId
  localFrame?: number
  durationInFrames?: number
  placa?: boolean
}> = ({ children, formato, animacao = "corte-seco", localFrame, durationInFrames, placa }) => {
  const frame = useCurrentFrame()
  const lf = localFrame ?? frame
  const t = TYPOGRAPHY.conviccao
  const fmt = FORMATOS[formato]
  const raw = textoLimpo(comoTexto(children))
  const fontSize = autoFontSize(raw, larguraTexto(fmt), {
    base: Math.round(fmt.width * t.escalaBase),
    min: t.tamanhoMin,
    avgAdvance: t.avgAdvance,
  })

  const dur = ANIMACOES[animacao].durationFrames
  const p = progressoEntrada(lf, dur, ANIMACOES[animacao].easing)
  const saida = opacidadeSaida(lf, durationInFrames)
  const translateY = (1 - saida) * -10 + (animacao === "fade" ? (1 - p) * 14 : 0)
  const opacity = animacao === "corte-seco" ? saida : saida * p
  const filter = animacao === "blur-in" ? `blur(${((1 - p) * 10).toFixed(2)}px)` : undefined

  // Filete dourado assinado: desenha após um pequeno atraso.
  const pRule = progressoEntrada(lf - SUBLINHADO.atrasoFrames, SUBLINHADO.durationFrames, SUBLINHADO.easing)

  const frase = (
    <span
      style={{
        fontFamily: `"${FONT_FAMILIES.conviccao}", "${t.fontFamily}", serif`,
        color: t.color,
        fontStyle: t.fontStyle,
        fontWeight: t.fontWeight,
        letterSpacing: t.letterSpacing,
        lineHeight: t.lineHeight,
        fontSize,
        maxWidth: "100%",
        textWrap: "pretty",
        textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 4px 22px rgba(0,0,0,0.6)",
        filter,
      }}
    >
      {segmentosInline(comoTexto(children), COLORS.brancoPuro)}
    </span>
  )

  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.round(fontSize * 0.28),
        transform: `translateY(${translateY.toFixed(2)}px)`,
        opacity,
      }}
    >
      {placa ? <PlacaFundo fontSize={fontSize}>{frase}</PlacaFundo> : frase}
      <span
        aria-hidden
        style={{
          display: "block",
          height: Math.max(2, Math.round(fontSize * 0.055)),
          width: `${Math.min(100, pRule * 100).toFixed(1)}%`,
          maxWidth: Math.round(fontSize * 5.5),
          background: OURO_MATERIAL,
          borderRadius: 999,
          boxShadow: `0 0 14px ${COLORS.douradoEnvelhecido}55`,
          opacity: pRule > 0 ? 1 : 0,
        }}
      />
    </span>
  )
}

// ─── CTA ("A Ordem") — chamada de conversão ──────────────────────────────────
export const TextoCTA: React.FC<{
  children: React.ReactNode
  formato: FormatoId
  animacao?: AnimacaoId
  localFrame?: number
  durationInFrames?: number
  handle?: string
}> = ({ children, formato, localFrame, durationInFrames, handle }) => {
  const frame = useCurrentFrame()
  const lf = localFrame ?? frame
  const t = TYPOGRAPHY.cta
  const fmt = FORMATOS[formato]
  const raw = textoLimpo(comoTexto(children))
  const fontSize = autoFontSize(raw, larguraTexto(fmt), {
    base: Math.round(fmt.width * t.escalaBase),
    min: t.tamanhoMin,
    avgAdvance: t.avgAdvance,
  })

  const p = progressoEntrada(lf, 12, "out-expo")
  const saida = opacidadeSaida(lf, durationInFrames)
  // Deriva sutil da seta (breathe, sem bounce).
  const drift = Math.sin(lf / 7) * 3

  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.round(fontSize * 0.5),
        opacity: saida * p,
        transform: `translateY(${((1 - p) * 16).toFixed(2)}px)`,
      }}
    >
      <span
        aria-hidden
        style={{
          height: 2,
          width: `${Math.min(100, p * 100).toFixed(0)}%`,
          maxWidth: Math.round(fontSize * 8),
          background: OURO_MATERIAL,
          borderRadius: 999,
          boxShadow: `0 0 12px ${COLORS.douradoEnvelhecido}55`,
        }}
      />
      <span style={{ display: "flex", alignItems: "center", gap: Math.round(fontSize * 0.5) }}>
        <span
          style={{
            fontFamily: `"${FONT_FAMILIES.impacto}", "${t.fontFamily}", sans-serif`,
            color: t.color,
            textTransform: t.textTransform,
            fontWeight: t.fontWeight,
            letterSpacing: t.letterSpacing,
            lineHeight: t.lineHeight,
            fontSize,
            textShadow: "0 2px 6px rgba(0,0,0,0.85)",
          }}
        >
          {segmentosInline(comoTexto(children), COLORS.douradoEnvelhecido)}
        </span>
        <span
          aria-hidden
          style={{
            color: COLORS.douradoEnvelhecido,
            fontSize: Math.round(fontSize * 1.15),
            transform: `translateX(${drift.toFixed(2)}px)`,
            filter: `drop-shadow(0 0 8px ${COLORS.douradoEnvelhecido}66)`,
          }}
        >
          →
        </span>
      </span>
      {handle ? (
        <span
          style={{
            fontFamily: `"${FONT_FAMILIES.conviccao}", serif`,
            fontStyle: "italic",
            color: COLORS.douradoLuz,
            fontSize: Math.round(fontSize * 0.72),
            letterSpacing: "0.02em",
            textShadow: "0 2px 6px rgba(0,0,0,0.85)",
          }}
        >
          @{handle}
        </span>
      ) : null}
    </span>
  )
}

/** Overlay de asset referenciado por tag (resolvido para URL pelo worker). */
export const AssetOverlay: React.FC<{
  src?: string
  animacao?: AnimacaoId
  localFrame?: number
  durationInFrames?: number
}> = ({ src, animacao = "fade", localFrame, durationInFrames }) => {
  const frame = useCurrentFrame()
  const lf = localFrame ?? frame
  const dur = ANIMACOES[animacao].durationFrames
  const p = progressoEntrada(lf, dur, ANIMACOES[animacao].easing)
  const saida = opacidadeSaida(lf, durationInFrames)
  if (!src) return null
  const opacity = animacao === "corte-seco" ? saida : saida * p
  const translateY = animacao === "fade" ? (1 - p) * 20 : 0
  const scale = animacao === "kick" ? 1 + (1 - p) * 0.12 : 1
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
        opacity,
        transform: `translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
      }}
    />
  )
}

/** Scrim de cena (Pilar 1) — mantido para compatibilidade. */
export const Scrim: React.FC = () => (
  <div aria-hidden style={{ position: "absolute", inset: 0, background: SCRIM_CENA }} />
)

/** Scrim por variante de preset (cena / inferior / low-key). */
export const ScrimVar: React.FC<{ variante: "cena" | "inferior" | "low-key" }> = ({ variante }) => {
  const bg = variante === "inferior" ? SCRIM_INFERIOR : variante === "low-key" ? SCRIM_LOWKEY : SCRIM_CENA
  return <div aria-hidden style={{ position: "absolute", inset: 0, background: bg }} />
}

/** Grão de filme cinematográfico animado (monocromático, blend overlay, sutil). */
export const Grao: React.FC<{ opacidade: number }> = ({ opacidade }) => {
  const frame = useCurrentFrame()
  if (opacidade <= 0) return null
  const seed = frame % 12
  const id = `grao-${seed}`
  return (
    <AbsoluteFill style={{ mixBlendMode: GRAO.blend, opacity: opacidade, pointerEvents: "none" }} aria-hidden>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id={id}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={GRAO.baseFrequency}
            numOctaves={GRAO.octaves}
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  )
}

/** Marca d'água @handle — na margem inferior, discreta (anti-repost).
 *  `ocultarEm`: intervalos [inicioFrame, fimFrame] onde ela some (ex.: durante o CTA). */
export const MarcaHandle: React.FC<{
  handle: string
  formato: FormatoId
  ocultarEm?: Array<[number, number]>
}> = ({ handle, formato, ocultarEm }) => {
  const frame = useCurrentFrame()
  const fmt = FORMATOS[formato]
  const size = Math.round(fmt.width * HANDLE.escala)
  if (ocultarEm?.some(([a, b]) => frame >= a && frame < b)) return null
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: Math.round((fmt.height - fmt.safe.bottom) * 0.34),
        textAlign: "center",
        opacity: HANDLE.opacidade,
      }}
    >
      <span
        style={{
          fontFamily: `"${FONT_FAMILIES.impacto}", sans-serif`,
          textTransform: "uppercase",
          letterSpacing: HANDLE.letterSpacing,
          fontWeight: 600,
          fontSize: size,
          color: COLORS.brancoGelo,
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        @{handle}
      </span>
    </div>
  )
}

export { COLORS, TYPOGRAPHY, FORMATOS }
export type { FormatoId, EstiloTexto, AnimacaoId, PosicaoId }
