import React from "react"
import { AbsoluteFill } from "remotion"
import { COLORS, FORMATOS, type FormatoId } from "../../../brand/tokens"

/**
 * Wrapper de formato — mesma composição base renderizada em 9:16 / 1:1 / 4:5.
 * Define o canvas (fundo preto profundo) e uma moldura de marca discreta.
 * As dimensões reais vêm de FORMATOS[formato] via calculateMetadata da Composition.
 */
export const FormatoFrame: React.FC<{
  formato: FormatoId
  children: React.ReactNode
  moldura?: boolean
}> = ({ formato, children, moldura = true }) => {
  const fmt = FORMATOS[formato]
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.pretoProfundo }}>
      {children}
      {moldura && (
        <AbsoluteFill
          style={{
            border: `2px solid ${COLORS.douradoEnvelhecido}22`,
            pointerEvents: "none",
          }}
          aria-hidden
        />
      )}
      {/* debug/render: nada além do frame; safe zone é aplicada pelas tracks */}
      <span style={{ display: "none" }}>{fmt.label}</span>
    </AbsoluteFill>
  )
}

export const FORMATO_IDS: FormatoId[] = ["VERTICAL_9_16", "QUADRADO_1_1", "RETRATO_4_5"]
