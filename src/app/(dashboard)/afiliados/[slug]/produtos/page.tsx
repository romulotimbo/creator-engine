import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AfiliadoSectionHeader } from "@/components/afiliados/afiliado-section-header"
import { decimalNum } from "@/lib/afiliados"
import ProdutosClient from "./ProdutosClient"

export default async function ProdutosHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const conta = await db.contaTrafego.findUnique({
    where: { slug },
    include: {
      produtos: { include: { produto: true }, orderBy: { createdAt: "desc" } },
    },
  })
  if (!conta) notFound()

  const catalogo = await db.produtoAfiliado.findMany({ orderBy: { nome: "asc" } })

  return (
    <div>
      <AfiliadoSectionHeader slug={slug} title="Produtos" description={conta.nome} activeSegment="produtos" />
      <ProdutosClient
        slug={slug}
        vinculos={conta.produtos.map((v) => ({
          id: v.id,
          produtoId: v.produtoId,
          linkTracking: v.linkTracking,
          ativo: v.ativo,
          produto: {
            ...v.produto,
            preco: v.produto.preco != null ? decimalNum(v.produto.preco) : null,
            comissaoPercent: v.produto.comissaoPercent != null ? decimalNum(v.produto.comissaoPercent) : null,
          },
        }))}
        catalogo={catalogo.map((p) => ({
          ...p,
          preco: p.preco != null ? decimalNum(p.preco) : null,
          comissaoPercent: p.comissaoPercent != null ? decimalNum(p.comissaoPercent) : null,
        }))}
      />
    </div>
  )
}
