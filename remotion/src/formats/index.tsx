import React from "react"
import { AbsoluteFill } from "remotion"
import { COLORS, FORMATOS, VINHETA, VINHETA_FORTE, REGISTRO, type FormatoId } from "../../../brand/tokens"

/** Marca de registro tática em um canto (L dourado sutil). */
const TickRegistro: React.FC<{ canto: "tl" | "tr" | "bl" | "br" }> = ({ canto }) => {
  const { tamanho, espessura, margem, opacidade } = REGISTRO
  const vert = canto[0] === "t" ? { top: margem } : { bottom: margem }
  const horiz = canto[1] === "l" ? { left: margem } : { right: margem }
  const cor = COLORS.douradoEnvelhecido
  return (
    <div aria-hidden style={{ position: "absolute", ...vert, ...horiz, width: tamanho, height: tamanho, opacity: opacidade }}>
      <div
        style={{
          position: "absolute",
          [canto[0] === "t" ? "top" : "bottom"]: 0,
          [canto[1] === "l" ? "left" : "right"]: 0,
          width: tamanho,
          height: espessura,
          background: cor,
        }}
      />
      <div
        style={{
          position: "absolute",
          [canto[0] === "t" ? "top" : "bottom"]: 0,
          [canto[1] === "l" ? "left" : "right"]: 0,
          width: espessura,
          height: tamanho,
          background: cor,
        }}
      />
    </div>
  )
}

/**
 * Wrapper de formato — mesma composição base em 9:16 / 1:1 / 4:5.
 * Canvas near-black + vinheta cinematográfica + marcas de registro táticas
 * (substituem a antiga moldura retangular genérica). As dimensões reais vêm de
 * FORMATOS[formato] via calculateMetadata da Composition.
 */
export const FormatoFrame: React.FC<{
  formato: FormatoId
  children: React.ReactNode
  moldura?: boolean
  vinheta?: boolean
  vinhetaForte?: boolean
}> = ({ formato, children, moldura = true, vinheta = true, vinhetaForte = false }) => {
  const fmt = FORMATOS[formato]
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.tinta }}>
      {children}

      {vinheta ? (
        <AbsoluteFill style={{ background: vinhetaForte ? VINHETA_FORTE : VINHETA, pointerEvents: "none" }} aria-hidden />
      ) : null}

      {moldura && (
        <>
          <TickRegistro canto="tl" />
          <TickRegistro canto="tr" />
          <TickRegistro canto="bl" />
          <TickRegistro canto="br" />
        </>
      )}

      <span style={{ display: "none" }}>{fmt.label}</span>
    </AbsoluteFill>
  )
}

export const FORMATO_IDS: FormatoId[] = ["VERTICAL_9_16", "QUADRADO_1_1", "RETRATO_4_5"]
