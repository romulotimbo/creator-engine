import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import { alinharComparativo, serializeIndice } from "@/lib/afiliados/indices"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: produtoId } = await params
  const produto = await db.produtoAfiliado.findUnique({
    where: { id: produtoId },
    select: { id: true, nome: true, slug: true },
  })
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

  const campanhas = await db.campanha.findMany({
    where: { produtoId },
    include: {
      contaTrafego: { select: { id: true, slug: true, nome: true } },
      indices: { include: { linhas: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const colunas = campanhas.map((c) => ({
    id: c.id,
    nomeCampanhaGoogleAds: c.nomeCampanhaGoogleAds,
    geo: c.geo,
    estrategia: c.estrategia,
    tipoBridge: c.tipoBridge,
    status: c.status,
    conta: c.contaTrafego
      ? { id: c.contaTrafego.id, slug: c.contaTrafego.slug, nome: c.contaTrafego.nome }
      : null,
    nomeContaAds: c.nomeContaAds,
    roiReal: c.roiReal != null ? decimalNum(c.roiReal) : null,
    cpaReal: c.cpaReal != null ? decimalNum(c.cpaReal) : null,
  }))

  const alinhadas = alinharComparativo(
    campanhas.map((c) => ({
      id: c.id,
      indices: c.indices.map((i) => {
        const s = serializeIndice(i)
        return { tipo: s.tipo, chave: s.chave, correspondencia: s.correspondencia, vigente: s.vigente }
      }),
    })),
  )

  return NextResponse.json({
    produto,
    campanhas: colunas,
    linhas: alinhadas,
  })
}
