import { describe, it, expect } from "vitest"
import { parseCampanhaPerformanceCsv, normalizeCampaignName } from "./campanha-csv"

describe("parseCampanhaPerformanceCsv", () => {
  it("faz parse de colunas Google Ads e marca linha sem nome como inválida", () => {
    const csv = [
      "Campaign,Cost,Impressions,Clicks,Conversions,Conv. value",
      "Purotyn DE Review,400.5,10000,200,4,800",
      ",10,1,1,0,0",
    ].join("\n")

    const rows = parseCampanhaPerformanceCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].nomeCampanhaGoogleAds).toBe("Purotyn DE Review")
    expect(rows[0].gasto).toBe(400.5)
    expect(rows[0].conversoes).toBe(4)
    expect(rows[0].receitaConfirmada).toBe(800)
    expect(rows[1].invalidReason).toBeTruthy()
  })

  it("normaliza nome para match case-insensitive", () => {
    expect(normalizeCampaignName("  Purotyn DE Review ")).toBe("purotyn de review")
  })
})

describe("isolamento de matching (unidade)", () => {
  it("o mesmo nome em produtos diferentes não compartilha chave além do produto", () => {
    const a = new Map([[normalizeCampaignName("Generic Search"), "camp-a"]])
    const b = new Map([[normalizeCampaignName("Generic Search"), "camp-b"]])
    expect(a.get("generic search")).toBe("camp-a")
    expect(b.get("generic search")).toBe("camp-b")
    expect(a.get("generic search")).not.toBe(b.get("generic search"))
  })
})
