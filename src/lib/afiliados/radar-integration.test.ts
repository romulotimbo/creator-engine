import { describe, it, expect } from "vitest"
import { parseProdutosCsv } from "./csv-parser"
import { calcularScoreOferta } from "./scoring"
import fs from "fs"
import path from "path"

describe("Radar Integration & Scoring Flow", () => {
  it("deve importar produtos.csv e calcular scores para todas as 18 ofertas", () => {
    const csvPath = path.resolve(process.cwd(), "docs/afiliados/produtos.csv")
    const csvText = fs.readFileSync(csvPath, "utf-8")

    const ofertas = parseProdutosCsv(csvText)
    expect(ofertas.length).toBe(18)

    ofertas.forEach((o) => {
      expect(o.nome).toBeTruthy()
      expect(o.scoreCalculado).toBeGreaterThanOrEqual(0)
      expect(o.scoreCalculado).toBeLessThanOrEqual(100)
      expect(["COMPLETO", "PARCIAL", "INCOMPLETO"]).toContain(o.completudeDados)
    })
  })

  it("deve promover a completude de dados de PARCIAL para COMPLETO ao adicionar métricas de Google Ads", () => {
    const ofertaBase = {
      epcRede: 3.54,
      comissaoValor: 190,
      refundPct: 0,
      tendenciaTrafego30d: -62.3,
    }

    const resParcial = calcularScoreOferta(ofertaBase)
    expect(resParcial.completudeDados).toBe("PARCIAL")

    const resCompleto = calcularScoreOferta({
      ...ofertaBase,
      cpcMedioEsperado: 1.5,
      volumeBuscaMensal: 12000,
    })
    expect(resCompleto.completudeDados).toBe("COMPLETO")
    expect(resCompleto.scoreCalculado).toBeGreaterThan(resParcial.scoreCalculado)
  })
})
