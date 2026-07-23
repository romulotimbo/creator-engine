import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AfiliadoSectionHeader } from "@/components/afiliados/afiliado-section-header"
import ContasClient from "./ContasClient"

export default async function ContasVinculadasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const conta = await db.contaTrafego.findUnique({
    where: { slug },
    include: { contasVinculadas: { orderBy: [{ tipo: "asc" }, { handle: "asc" }] } },
  })
  if (!conta) notFound()

  return (
    <div>
      <AfiliadoSectionHeader
        slug={slug}
        title="Contas vinculadas"
        description={conta.nome}
        activeSegment="contas"
      />
      <ContasClient slug={slug} contas={conta.contasVinculadas} />
    </div>
  )
}
