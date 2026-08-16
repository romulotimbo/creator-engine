import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import { CampanhaFichaClient, type CampanhaFichaData } from "./CampanhaFichaClient"

export default async function CampanhaFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campanha = await db.campanha.findUnique({
    where: { id },
    include: {
      produto: { select: { id: true, slug: true, nome: true } },
      contaTrafego: { select: { id: true, slug: true, nome: true } },
      snapshots: { orderBy: { dataSnapshot: "desc" } },
    },
  })
  if (!campanha) notFound()

  const payload: CampanhaFichaData = {
    id: campanha.id,
    produtoId: campanha.produtoId,
    produto: campanha.produto,
    nomeCampanhaGoogleAds: campanha.nomeCampanhaGoogleAds,
    geo: campanha.geo,
    estrategia: campanha.estrategia,
    papelConta: campanha.papelConta,
    status: campanha.status,
    budgetDiarioDefinido: campanha.budgetDiarioDefinido != null ? decimalNum(campanha.budgetDiarioDefinido) : null,
    budgetTesteAlocado: campanha.budgetTesteAlocado != null ? decimalNum(campanha.budgetTesteAlocado) : null,
    contaTrafegoId: campanha.contaTrafegoId,
    contaTrafego: campanha.contaTrafego,
    nomeContaAds: campanha.nomeContaAds,
    dataInicio: campanha.dataInicio ? campanha.dataInicio.toISOString().slice(0, 10) : null,
    dataFim: campanha.dataFim ? campanha.dataFim.toISOString().slice(0, 10) : null,
    linkPainelGoogleAds: campanha.linkPainelGoogleAds,
    moeda: campanha.moeda,
    snapshots: campanha.snapshots.map((s) => ({
      id: s.id,
      dataSnapshot: s.dataSnapshot.toISOString().slice(0, 10),
      gasto: s.gasto != null ? decimalNum(s.gasto) : null,
    })),
  }

  return <CampanhaFichaClient initial={payload} />
}
