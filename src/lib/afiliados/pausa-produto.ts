import type { Prisma, PrismaClient } from "@prisma/client"
import { decimalNum } from "@/lib/afiliados"
import { mudarStatusCampanha } from "@/lib/afiliados/campanha-status"
import { expirarFilaCampanhas } from "@/lib/afiliados/fila"

type Client = PrismaClient | Prisma.TransactionClient

const NO_AR = ["TESTANDO", "ESCALANDO"] as const

export type LeituraTrafego = {
  trafego: "NO_AR" | "SEM_TRAFEGO"
  produtoStatus: string
  produtoId: string
  produtoSlug: string
  gasto: number | null
  budget: number | null
  campanhaId: string | null
}

export function leituraTrafegoDeProduto(p: {
  id: string
  slug: string
  status: string
  gastoTotalAcumulado?: { toString(): string } | number | null
  budgetTesteAlocado?: { toString(): string } | number | null
  campanhas: Array<{ id: string; status: string }>
}): LeituraTrafego {
  const noAr = p.campanhas.find((c) => (NO_AR as readonly string[]).includes(c.status))
  return {
    trafego: noAr ? "NO_AR" : "SEM_TRAFEGO",
    produtoStatus: p.status,
    produtoId: p.id,
    produtoSlug: p.slug,
    gasto: p.gastoTotalAcumulado != null ? decimalNum(p.gastoTotalAcumulado) : null,
    budget: p.budgetTesteAlocado != null ? decimalNum(p.budgetTesteAlocado) : null,
    campanhaId: noAr?.id ?? p.campanhas[0]?.id ?? null,
  }
}

export function produtoAceitaCampanhaNova(status: string): boolean {
  return status === "ATIVO"
}

export function deveCascatearPausaProduto(status: string | undefined): status is "PAUSADO" | "ARQUIVADO" {
  return status === "PAUSADO" || status === "ARQUIVADO"
}

export const PRODUTO_LEITURA_SELECT = {
  id: true,
  slug: true,
  status: true,
  gastoTotalAcumulado: true,
  budgetTesteAlocado: true,
  campanhas: { select: { id: true, status: true } },
} as const

export function leituraTrafegoDeOferta(o: {
  statusDecisao: string
  produtosGerados?: Array<{
    id: string
    slug: string
    status: string
    gastoTotalAcumulado?: { toString(): string } | number | null
    budgetTesteAlocado?: { toString(): string } | number | null
    campanhas: Array<{ id: string; status: string }>
  }>
}): LeituraTrafego | null {
  if (o.statusDecisao !== "EM_EXECUCAO") return null
  const produtos = o.produtosGerados ?? []
  if (!produtos.length) return null
  const noAr = produtos.find((p) => p.campanhas.some((c) => (NO_AR as readonly string[]).includes(c.status)))
  return leituraTrafegoDeProduto(noAr ?? produtos[0])
}

/**
 * Pausa campanhas TESTANDO/ESCALANDO do produto e expira a fila aberta delas.
 * ENCERRADO/PAUSADO ficam. Não escreve no Google Ads.
 */
export async function cascatearPausaProduto(
  client: Client,
  produtoId: string,
  motivo: "produto pausado" | "produto arquivado",
): Promise<string[]> {
  const campanhas = await client.campanha.findMany({
    where: { produtoId, status: { in: [...NO_AR] } },
    select: { id: true },
  })
  const ids = campanhas.map((c) => c.id)
  for (const id of ids) {
    await mudarStatusCampanha(client, id, "PAUSADO", motivo)
  }
  await expirarFilaCampanhas(client, ids)
  return ids
}
