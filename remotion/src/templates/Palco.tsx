import React from "react"
import { AbsoluteFill, Img, OffthreadVideo, Sequence } from "remotion"
import { FormatoFrame } from "../formats"
import {
  SafeZone,
  ScrimVar,
  Grao,
  MarcaHandle,
  TextoImpacto,
  TextoConviccao,
  TextoCTA,
  AssetOverlay,
  CoberturaTextoBaked,
} from "../brand/components"
import { PRESETS, type PresetId } from "../../../brand/tokens"
import type { CompositionProps } from "../../../src/lib/estudio/timeline"

/**
 * Motor de palco único, parametrizado por `preset` (pilar). Cada composição
 * Remotion é um wrapper fino que fixa o preset; o worker escolhe a composição
 * por `TemplateVideo.composicao`. Toda a identidade (fonte, cor, animação,
 * scrim, grão, vinheta, marca d'água) vem dos tokens/componentes de marca.
 *
 * O clima muda por pilar; as tracks (texto/asset) continuam 100% parametrizadas
 * pelo roteiro — é isso que permite produzir Reels/Stories em lote.
 */
export const Palco: React.FC<CompositionProps & { preset: PresetId }> = ({
  preset,
  formato,
  fonteVideoSrc,
  fonteImagemSrc,
  overlayImagem,
  assets,
  handle,
  tracks,
}) => {
  const cfg = PRESETS[preset]
  const overlay = Boolean(overlayImagem)
  // Marca d'água some apenas DURANTE o CTA (que já exibe o handle), não no vídeo todo.
  const ctaRanges = tracks
    .filter((t) => t.tipo === "texto" && t.estilo === "cta")
    .map((t) => [t.inicioFrame, t.fimFrame] as [number, number])
  const mostrarMarca = Boolean(handle) && cfg.handlePadrao && !overlay
  return (
    <FormatoFrame
      formato={formato}
      vinhetaForte={cfg.vinhetaForte}
      moldura={!overlay}
      vinheta={!overlay}
    >
      {fonteImagemSrc ? (
        <AbsoluteFill>
          <Img
            src={fonteImagemSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : fonteVideoSrc ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={fonteVideoSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : null}

      {overlay ? <CoberturaTextoBaked formato={formato} /> : null}
      {!overlay ? <ScrimVar variante={cfg.scrim} /> : null}
      {!overlay ? <Grao opacidade={cfg.grao} /> : null}

      {tracks.map((t, i) => {
        const dur = Math.max(1, t.fimFrame - t.inicioFrame)
        return (
          <Sequence key={i} from={t.inicioFrame} durationInFrames={dur} layout="none">
            {t.tipo === "asset" ? (
              <AssetOverlay
                src={t.assetTag ? assets?.[t.assetTag] : undefined}
                animacao={t.animacao}
                durationInFrames={dur}
              />
            ) : (
              <SafeZone formato={formato} posicao={t.posicao}>
                {t.estilo === "cta" ? (
                  <TextoCTA formato={formato} animacao={t.animacao} durationInFrames={dur} handle={handle}>
                    {t.conteudo}
                  </TextoCTA>
                ) : t.estilo === "conviccao" ? (
                  <TextoConviccao formato={formato} animacao={t.animacao} durationInFrames={dur} placa={t.placa}>
                    {t.conteudo}
                  </TextoConviccao>
                ) : (
                  <TextoImpacto formato={formato} animacao={t.animacao} durationInFrames={dur} placa={t.placa}>
                    {t.conteudo}
                  </TextoImpacto>
                )}
              </SafeZone>
            )}
          </Sequence>
        )
      })}

      {mostrarMarca ? <MarcaHandle handle={handle!} formato={formato} ocultarEm={ctaRanges} /> : null}
    </FormatoFrame>
  )
}
