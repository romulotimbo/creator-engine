import { describe, it, expect } from "vitest"
import { assertTransicaoOfertaValida, OfertaTerminalError } from "./oferta-status"

describe("assertTransicaoOfertaValida", () => {
  it("rejeita qualquer transição de EM_EXECUCAO para outro status — terminal", () => {
    expect(() => assertTransicaoOfertaValida("EM_EXECUCAO", "PAUSADO")).toThrow(OfertaTerminalError)
    expect(() => assertTransicaoOfertaValida("EM_EXECUCAO", "DESCARTADO")).toThrow(OfertaTerminalError)
    expect(() => assertTransicaoOfertaValida("EM_EXECUCAO", "GARIMPO")).toThrow(OfertaTerminalError)
    expect(() => assertTransicaoOfertaValida("EM_EXECUCAO", "ANALISE")).toThrow(OfertaTerminalError)
    expect(() => assertTransicaoOfertaValida("EM_EXECUCAO", "APROVADO_TESTE")).toThrow(OfertaTerminalError)
  })

  it("PAUSADO/DESCARTADO continuam válidos ANTES da conversão", () => {
    expect(() => assertTransicaoOfertaValida("ANALISE", "PAUSADO")).not.toThrow()
    expect(() => assertTransicaoOfertaValida("APROVADO_TESTE", "DESCARTADO")).not.toThrow()
  })

  it("a conversão em si (→ EM_EXECUCAO) é permitida", () => {
    expect(() => assertTransicaoOfertaValida("APROVADO_TESTE", "EM_EXECUCAO")).not.toThrow()
  })

  it("transições comuns entre estados pré-conversão continuam livres", () => {
    expect(() => assertTransicaoOfertaValida("GARIMPO", "ANALISE")).not.toThrow()
    expect(() => assertTransicaoOfertaValida("ANALISE", "APROVADO_TESTE")).not.toThrow()
  })
})
