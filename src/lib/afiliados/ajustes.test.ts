import { describe, it, expect } from "vitest"
import { ajusteCampanhaManualSchema } from "./ajustes"
import { itemFilaAcaoSchema, ajustesDaConfirmacao } from "./fila"

describe("ajustesDaConfirmacao", () => {
  it("formato singular vira lista de 1", () => {
    const acao = itemFilaAcaoSchema.parse({
      acao: "confirmar",
      tipoAjuste: "BUDGET",
      valorAplicado: 100,
      valorAnterior: 80,
      motivo: "teste",
    })
    if (acao.acao !== "confirmar") throw new Error("esperava confirmar")
    const ajustes = ajustesDaConfirmacao(acao)
    expect(ajustes).toEqual([{ tipoAjuste: "BUDGET", valorAplicado: 100, valorAnterior: 80, motivo: "teste" }])
  })

  it("um ItemFila pode gerar múltiplos ajustes — regra de segmento (geo + dispositivo)", () => {
    const acao = itemFilaAcaoSchema.parse({
      acao: "confirmar",
      ajustes: [
        { tipoAjuste: "LANCE_SEGMENTO", valorAplicado: 1.2, motivo: "CA (+20%)" },
        { tipoAjuste: "LANCE_SEGMENTO", valorAplicado: 0.5, motivo: "MOBILE (-50%)" },
      ],
    })
    if (acao.acao !== "confirmar") throw new Error("esperava confirmar")
    const ajustes = ajustesDaConfirmacao(acao)
    expect(ajustes).toHaveLength(2)
    expect(ajustes[0].motivo).toBe("CA (+20%)")
    expect(ajustes[1].motivo).toBe("MOBILE (-50%)")
  })

  it("confirmação simples sem ajuste não gera nenhum AjusteCampanha", () => {
    const acao = itemFilaAcaoSchema.parse({ acao: "confirmar" })
    if (acao.acao !== "confirmar") throw new Error("esperava confirmar")
    expect(ajustesDaConfirmacao(acao)).toEqual([])
  })

  it("origem=FILA nunca aceita data retroativa — o schema de confirmação não tem campo `data` (fixada no instante da confirmação)", () => {
    const acao = itemFilaAcaoSchema.parse({
      acao: "confirmar",
      tipoAjuste: "BUDGET",
      valorAplicado: 100,
      data: "2020-01-01", // tentativa de injetar data — ignorada (zod strip), não faz parte do schema de confirmação
    })
    if (acao.acao !== "confirmar") throw new Error("esperava confirmar")
    expect("data" in acao).toBe(false)
  })
})

describe("ajusteCampanhaManualSchema — data retroativa só em MANUAL", () => {
  it("aceita data explícita (retroativa) — só o registro MANUAL usa este schema", () => {
    const parsed = ajusteCampanhaManualSchema.parse({
      tipo: "BUDGET",
      valorAnterior: 50,
      valorNovo: 80,
      data: "2026-01-01",
      motivo: "ajuste retroativo",
    })
    expect(parsed.data?.toISOString().slice(0, 10)).toBe("2026-01-01")
  })

  it("data é opcional — default fica a cargo do handler (instante da requisição)", () => {
    const parsed = ajusteCampanhaManualSchema.parse({ tipo: "CPA_ALVO" })
    expect(parsed.data).toBeUndefined()
  })
})
