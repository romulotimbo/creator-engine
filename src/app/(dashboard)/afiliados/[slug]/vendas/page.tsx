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

  const vendas = await db.vendaAfiliado.findMany({
    where: { contaTrafegoId: conta.id },
    include: { produto: { select: { id: true, nome: true } } },
    orderBy: { data: "desc" },
  })

  return (
    <div>
      <AfiliadoSectionHeader slug={slug} title="Vendas / comissões" description={conta.nome} activeSegment="vendas" />
      <VendasClient
        slug={slug}
        contaTrafegoId={conta.id}
        produtos={conta.produtos.map((v) => v.produto)}
        vendas={vendas.map((v) => ({
          id: v.id,
          data: v.data.toISOString(),
          valorVenda: decimalNum(v.valorVenda),
          valorComissao: decimalNum(v.valorComissao),
          plataformaAfil: v.plataformaAfil,
          status: v.status,
          produto: v.produto,
          observacoes: v.observacoes,
        }))}
      />
    </div>
  )
}
