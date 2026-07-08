import React from "react"
import { Composition } from "remotion"
import { GanchoIncongruencia } from "./templates/GanchoIncongruencia"
import { BastidoresDisciplina } from "./templates/BastidoresDisciplina"
import { ProvocacaoConversao } from "./templates/ProvocacaoConversao"
import { FORMATOS } from "../../brand/tokens"
import {
  timelineParaProps,
  type CompositionProps,
  type Timeline,
} from "../../src/lib/estudio/timeline"

// Roteiros de demonstração para o Studio (dev). No render de produção o worker
// injeta as props derivadas do roteiro real via inputProps.

// Pilar 1 — Atração: cascata + realce dourado + kick no encerramento.
const demoGancho: Timeline = {
  tracks: [
    { tipo: "texto", inicio: 0, fim: 2.6, conteudo: "REBELDE POR *NATUREZA*", estilo: "impacto", animacao: "cascata", posicao: "safe-center" },
    { tipo: "texto", inicio: 2.6, fim: 5.2, conteudo: "conservadora por convicção", estilo: "conviccao", animacao: "fade", posicao: "safe-center" },
    { tipo: "texto", inicio: 5.2, fim: 7.6, conteudo: "SÓ VEM.", estilo: "impacto", animacao: "kick", posicao: "safe-bottom" },
  ],
}

// Pilar 2 — Conexão: terço inferior + blur-in + marca d'água @handle.
const demoBastidores: Timeline = {
  handle: "veesemfiltro",
  tracks: [
    { tipo: "texto", inicio: 0, fim: 3, conteudo: "TREINO PESADO", estilo: "impacto", animacao: "write-on", posicao: "safe-bottom" },
    { tipo: "texto", inicio: 3, fim: 6.5, conteudo: "olhar mais pesado ainda…", estilo: "conviccao", animacao: "blur-in", posicao: "safe-bottom" },
  ],
}

// Pilar 3 — Conversão: mask-wipe, low-key, encerra em CTA (link na bio).
const demoProvocacao: Timeline = {
  handle: "veesemfiltro",
  tracks: [
    { tipo: "texto", inicio: 0, fim: 2.8, conteudo: "OLHAR *AFIADO*", estilo: "impacto", animacao: "mask-wipe", posicao: "safe-center" },
    { tipo: "texto", inicio: 2.8, fim: 5.4, conteudo: "te incomoda ou te atrai?", estilo: "conviccao", animacao: "fade", posicao: "safe-center" },
    { tipo: "texto", inicio: 5.4, fim: 8, conteudo: "LINK NA BIO", estilo: "cta", animacao: "corte-seco", posicao: "safe-bottom" },
  ],
}

// Vitrine — usa TODOS os elementos/animações num único vídeo (preset provocação:
// grão + vinheta forte + marca d'água). Cada track é um recurso isolado no tempo.
const demoTodos: Timeline = {
  handle: "veesemfiltro",
  tracks: [
    // 1. impacto · write-on · topo · realce
    { tipo: "texto", inicio: 0, fim: 2.5, conteudo: "IDENTIDADE *TÁTICA*", estilo: "impacto", animacao: "write-on", posicao: "safe-top" },
    // 2. impacto · cascata · centro · realce
    { tipo: "texto", inicio: 2.5, fim: 5, conteudo: "REBELDE POR *NATUREZA*", estilo: "impacto", animacao: "cascata", posicao: "safe-center" },
    // 3. impacto · mask-wipe · centro · realce
    { tipo: "texto", inicio: 5, fim: 7, conteudo: "OLHAR *AFIADO*", estilo: "impacto", animacao: "mask-wipe", posicao: "safe-center" },
    // 4. convicção · blur-in · centro · realce (branco) + filete dourado
    { tipo: "texto", inicio: 7, fim: 9.2, conteudo: "conservadora por *convicção*", estilo: "conviccao", animacao: "blur-in", posicao: "safe-center" },
    // 5. convicção · fade · base · PLACA de contraste
    { tipo: "texto", inicio: 9.2, fim: 11.4, conteudo: "quem aguenta o ritmo?", estilo: "conviccao", animacao: "fade", posicao: "safe-bottom", placa: true },
    // 6. impacto · kick · centro
    { tipo: "texto", inicio: 11.4, fim: 13.4, conteudo: "SÓ VEM.", estilo: "impacto", animacao: "kick", posicao: "safe-center" },
    // 7. CTA · corte-seco · base (+ @handle; marca d'água some só aqui)
    { tipo: "texto", inicio: 13.4, fim: 16, conteudo: "LINK NA BIO", estilo: "cta", animacao: "corte-seco", posicao: "safe-bottom" },
  ],
}

function props(timeline: Timeline): CompositionProps {
  return timelineParaProps(timeline, "VERTICAL_9_16")
}

const metadata = ({ props: p }: { props: CompositionProps }) => {
  const fmt = FORMATOS[p.formato]
  return {
    width: fmt.width,
    height: fmt.height,
    fps: fmt.fps,
    durationInFrames: Math.max(1, Math.round(p.durationInFrames)),
  }
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="gancho-incongruencia"
        component={GanchoIncongruencia}
        defaultProps={props(demoGancho)}
        calculateMetadata={metadata}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
      />
      <Composition
        id="bastidores-disciplina"
        component={BastidoresDisciplina}
        defaultProps={props(demoBastidores)}
        calculateMetadata={metadata}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
      />
      <Composition
        id="provocacao-conversao"
        component={ProvocacaoConversao}
        defaultProps={props(demoProvocacao)}
        calculateMetadata={metadata}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
      />
      <Composition
        id="demo-todos-elementos"
        component={ProvocacaoConversao}
        defaultProps={props(demoTodos)}
        calculateMetadata={metadata}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
      />
    </>
  )
}
