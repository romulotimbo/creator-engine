import React from "react"
import { AbsoluteFill, OffthreadVideo, Sequence } from "remotion"
import { FormatoFrame } from "../formats"
import {
  SafeZone,
  Scrim,
  TextoImpacto,
  TextoConviccao,
  AssetOverlay,
} from "../brand/components"
import type { CompositionProps } from "../../../src/lib/estudio/timeline"

/**
 * Template PoC "Gancho da Incongruência" (Pilar 1 — Atração).
 * Vídeo bruto full-bleed + scrim + tracks de texto/asset parametrizadas pelo roteiro.
 * Toda a identidade (fonte, cor, animação) vem dos tokens/componentes de marca.
 */
export const GanchoIncongruencia: React.FC<CompositionProps> = ({
  formato,
  fonteVideoSrc,
  assets,
  tracks,
}) => {
  return (
    <FormatoFrame formato={formato}>
      {fonteVideoSrc ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={fonteVideoSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : null}

      <Scrim />

      {tracks.map((t, i) => {
        const dur = Math.max(1, t.fimFrame - t.inicioFrame)
        return (
          <Sequence key={i} from={t.inicioFrame} durationInFrames={dur} layout="none">
            {t.tipo === "asset" ? (
              <AssetOverlay src={t.assetTag ? assets?.[t.assetTag] : undefined} animacao={t.animacao} />
            ) : (
              <SafeZone formato={formato} posicao={t.posicao}>
                {t.estilo === "conviccao" ? (
                  <TextoConviccao animacao={t.animacao}>{t.conteudo}</TextoConviccao>
                ) : (
                  <TextoImpacto animacao={t.animacao}>{t.conteudo}</TextoImpacto>
                )}
              </SafeZone>
            )}
          </Sequence>
        )
      })}
    </FormatoFrame>
  )
}
