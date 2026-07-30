import { describe, it, expect } from "vitest"
import { parseProdutosCsv } from "./csv-parser"
import fs from "fs"
import path from "path"

describe("parseProdutosCsv", () => {
  it("deve parsear o arquivo produtos.csv real corretamente", () => {
    const csvPath = path.resolve(process.cwd(), "docs/afiliados/produtos.csv")
    const content = fs.readFileSync(csvPath, "utf-8")

    const items = parseProdutosCsv(content)
    expect(items.length).toBe(18)

    // LipoBliss
    const lipo = items.find((i) => i.nome.includes("LipoBliss"))
    expect(lipo).toBeDefined()
    expect(lipo?.plataformas).toEqual(["BuyGoods", "GuruMedia"])
    expect(lipo?.comissaoValor).toBe(190)
    expect(lipo?.epcRede).toBe(3.54)
    expect(lipo?.cvrRede).toBe(2.43)
    expect(lipo?.refundPct).toBe(0.0)
    expect(lipo?.tendenciaTrafego30d).toBe(-62.3)
    expect(lipo?.scoreCalculado).toBeGreaterThan(0)

    // Nerve Fresh (ClickBank)
    const nerve = items.find((i) => i.nome.includes("Nerve Fresh"))
    expect(nerve).toBeDefined()
    expect(nerve?.cbGravity).toBe(14.77)
    expect(nerve?.cbScore).toBe(235.56)
  })
})
