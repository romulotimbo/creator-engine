import { describe, it, expect } from "vitest"
import {
  validarTimeline,
  timelineParaProps,
  segundosParaFrames,
  type Timeline,
} from "./timeline"

const timelineValida: Timeline = {
  tracks: [
    { tipo: "texto", inicio: 0, fim: 5, conteudo: "Rebelde por natureza", estilo: "impacto", animacao: "write-on", posicao: "safe-center" },
    { tipo: "texto", inicio: 5, fim: 8, conteudo: "conservadora por convicção", estilo: "conviccao", animacao: "corte-seco", posicao: "safe-bottom" },
    { tipo: "asset", inicio: 4, fim: 6, assetTag: "moldura-tatica", animacao: "fade", posicao: "safe-center" },
  ],
}

describe("validarTimeline — casos válidos", () => {
  it("aceita um roteiro bem-formado dentro da duração e com tags existentes", () => {
    const r = validarTimeline(timelineValida, {
      duracaoFonteSeg: 10,
      tagsDisponiveis: ["moldura-tatica"],
    })
    expect(r.ok).toBe(true)
    expect(r.data?.tracks).toHaveLength(3)
    expect(r.erros).toHaveLength(0)
  })

  it("aplica defaults de animação/posição quando omitidos", () => {
    const r = validarTimeline({
      tracks: [{ tipo: "texto", inicio: 0, fim: 3, conteudo: "X", estilo: "impacto" }],
    })
    expect(r.ok).toBe(true)
    expect(r.data?.tracks[0].animacao).toBe("corte-seco")
    expect(r.data?.tracks[0].posicao).toBe("safe-center")
  })
})

describe("validarTimeline — rejeições", () => {
  it("rejeita timeline sem tracks", () => {
    const r = validarTimeline({ tracks: [] })
    expect(r.ok).toBe(false)
    expect(r.erros.join(" ")).toMatch(/ao menos uma track/)
  })

  it("rejeita intervalo com fim <= início", () => {
    const r = validarTimeline({
      tracks: [{ tipo: "texto", inicio: 5, fim: 5, conteudo: "X", estilo: "impacto" }],
    })
    expect(r.ok).toBe(false)
    expect(r.erros.join(" ")).toMatch(/maior que início/)
  })

  it("rejeita intervalo que excede a duração da fonte", () => {
    const r = validarTimeline(timelineValida, { duracaoFonteSeg: 6 })
    expect(r.ok).toBe(false)
    expect(r.erros.join(" ")).toMatch(/excede a duração da fonte/)
  })

  it("rejeita assetTag inexistente na biblioteca", () => {
    const r = validarTimeline(timelineValida, {
      duracaoFonteSeg: 10,
      tagsDisponiveis: ["outra-tag"],
    })
    expect(r.ok).toBe(false)
    expect(r.erros.join(" ")).toMatch(/não existe na biblioteca/)
  })

  it("rejeita estilo fora da hierarquia Tactical Rebel", () => {
    const r = validarTimeline({
      tracks: [{ tipo: "texto", inicio: 0, fim: 3, conteudo: "X", estilo: "neon" }],
    })
    expect(r.ok).toBe(false)
  })
})

describe("segundosParaFrames", () => {
  it("converte segundos em frames pelo fps", () => {
    expect(segundosParaFrames(1, 30)).toBe(30)
    expect(segundosParaFrames(0.5, 30)).toBe(15)
    expect(segundosParaFrames(2, 25)).toBe(50)
  })
})

describe("timelineParaProps", () => {
  it("converte tempos em frames e mapeia campos por tipo (9:16, 30fps)", () => {
    const props = timelineParaProps(timelineValida, "VERTICAL_9_16", {
      fonteVideoSrc: "/inbox/clip.mp4",
      assets: { "moldura-tatica": "/assets/moldura.png" },
    })
    expect(props.width).toBe(1080)
    expect(props.height).toBe(1920)
    expect(props.fps).toBe(30)
    expect(props.tracks[0].inicioFrame).toBe(0)
    expect(props.tracks[0].fimFrame).toBe(150)
    expect(props.tracks[0].estilo).toBe("impacto")
    expect(props.tracks[2].tipo).toBe("asset")
    expect(props.tracks[2].assetTag).toBe("moldura-tatica")
    expect(props.fonteVideoSrc).toBe("/inbox/clip.mp4")
  })
})
