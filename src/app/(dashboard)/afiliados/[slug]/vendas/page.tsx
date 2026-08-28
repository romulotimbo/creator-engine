import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AfiliadoSectionHeader } from "@/components/afiliados/afiliado-section-header"
import { decimalNum } from "@/lib/afiliados"
import VendasClient from "./VendasClient"

export default async function VendasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const conta = await db.contaTrafego.findUnique({
    where: { slug },
    include: {
      produtos: { include: { produto: { select: { id: true, nome: true, plataformaAfil: true } } } },
    },
  })
  if (!conta) notFound()

  const produtoIds = conta.produtos.map((v) => v.produto.id)

  const [vendas, campanhas] = await Promise.all([
    db.vendaAfiliado.findMany({
      where: { contaTrafegoId: conta.id },
      include: { produto: { select: { id: true, nome: true } }, campanha: { select: { id: true, nomeCampanhaGoogleAds: true } } },
      orderBy: { data: "desc" },
    }),
    db.campanha.findMany({
      where: { produtoId: { in: produtoIds } },
      select: { id: true, nomeCampanhaGoogleAds: true, produto: { select: { nome: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return (
    <div>
      <AfiliadoSectionHeader slug={slug} title="Vendas / comissões" description={conta.nome} activeSegment="vendas" />
      <VendasClient
        slug={slug}
        contaTrafegoId={conta.id}
        produtos={conta.produtos.map((v) => v.produto)}
        campanhas={campanhas.map((c) => ({ id: c.id, label: `${c.nomeCampanhaGoogleAds} · ${c.produto.nome}` }))}
        vendas={vendas.map((v) => ({
          id: v.id,
          data: v.data.toISOString(),
          valorVenda: decimalNum(v.valorVenda),
          valorComissao: decimalNum(v.valorComissao),
          plataformaAfil: v.plataformaAfil,
          status: v.status,
          produto: v.produto,
          campanha: v.campanha,
          observacoes: v.observacoes,
        }))}
      />
    </div>
  )
}
