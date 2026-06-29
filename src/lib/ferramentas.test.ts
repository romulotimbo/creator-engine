import { describe, expect, it } from "vitest"
import { Prisma } from "@prisma/client"
import { serializeFerramenta } from "./ferramentas"

describe("serializeFerramenta", () => {
  it("converte Decimal custoMensal para number", () => {
    const row = {
      id: "1",
      nome: "RunPod",
      categoria: "GERACAO_IMAGEM" as const,
      urlAcesso: null,
      versaoAtual: null,
      statusAssinatura: "ATIVA" as const,
      custoMensal: new Prisma.Decimal("49.90"),
      dataRenovacao: new Date("2026-07-01"),
      responsavelConta: null,
      documentacao: null,
      configuracaoPadrao: null,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const dto = serializeFerramenta(row)
    expect(dto.custoMensal).toBe(49.9)
    expect(typeof dto.custoMensal).toBe("number")
    expect(dto.dataRenovacao).toMatch(/2026-07-01/)
  })

  it("normaliza tags null", () => {
    const row = {
      id: "2",
      nome: "Legado",
      categoria: "PROXY" as const,
      urlAcesso: null,
      versaoAtual: null,
      statusAssinatura: "ATIVA" as const,
      custoMensal: null,
      dataRenovacao: null,
      responsavelConta: null,
      documentacao: null,
      configuracaoPadrao: null,
      tags: null as unknown as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(serializeFerramenta(row as Parameters<typeof serializeFerramenta>[0]).tags).toEqual([])
  })
})
