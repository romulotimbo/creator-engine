import React from "react"
import { Composition } from "remotion"
import { GanchoIncongruencia } from "./templates/GanchoIncongruencia"
import { FORMATOS } from "../../brand/tokens"
import {
  timelineParaProps,
  type CompositionProps,
  type Timeline,
} from "../../src/lib/estudio/timeline"

// Roteiro de demonstração para o Studio (dev). No render de produção o worker
// injeta as props derivadas do roteiro real via inputProps.
const demoTimeline: Timeline = {
  tracks: [
    { tipo: "texto", inicio: 0, fim: 3, conteudo: "REBELDE POR NATUREZA", estilo: "impacto", animacao: "write-on", posicao: "safe-center" },
    { tipo: "texto", inicio: 3, fim: 6, conteudo: "conservadora por convicção", estilo: "conviccao", animacao: "corte-seco", posicao: "safe-bottom" },
  ],
}

const demoProps: CompositionProps = timelineParaProps(demoTimeline, "VERTICAL_9_16")

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="gancho-incongruencia"
      component={GanchoIncongruencia}
      defaultProps={demoProps}
      // Dimensões/fps/duração derivam das props (formato + durationInFrames),
      // permitindo 9:16 / 1:1 / 4:5 da mesma composição.
      calculateMetadata={({ props }) => {
        const fmt = FORMATOS[props.formato]
        return {
          width: fmt.width,
          height: fmt.height,
          fps: fmt.fps,
          durationInFrames: Math.max(1, Math.round(props.durationInFrames)),
        }
      }}
      // Placeholders substituídos por calculateMetadata:
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={90}
    />
  )
}
