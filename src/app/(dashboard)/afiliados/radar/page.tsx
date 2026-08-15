import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import { RadarClient } from "./RadarClient"

export default async function RadarPage() {
  const ofertas = await db.ofertaDecisao.findMany({
    orderBy: { createdAt: "desc" },
  })

  const formatted = ofertas.map((o) => ({
    id: o.id,
    nome: o.nome,
    plataformas: o.plataformas,
    vertical: o.vertical,
    geoPrioritario: o.geoPrioritario,
    geosPermitidos: o.geosPermitidos,
    createdAt: o.createdAt.toISOString(),
    saturacaoAfiliados: o.saturacaoAfiliados,
    conversionPoint: o.conversionPoint,
    tipoProduto: o.tipoProduto,
    ltvEstimadoRebill: o.ltvEstimadoRebill != null ? decimalNum(o.ltvEstimadoRebill) : null,
    criterioPausa: o.criterioPausa,
    criterioEscala: o.criterioEscala,
    visitasTotais: o.visitasTotais,
    tendenciaTrafego30d: o.tendenciaTrafego30d != null ? decimalNum(o.tendenciaTrafego30d) : null,
    tendenciaTrafego60d: o.tendenciaTrafego60d != null ? decimalNum(o.tendenciaTrafego60d) : null,
    tendenciaTrafego90d: o.tendenciaTrafego90d != null ? decimalNum(o.tendenciaTrafego90d) : null,
    statusTendencia: o.statusTendencia,
    comissaoValor: o.comissaoValor != null ? decimalNum(o.comissaoValor) : null,
    epcRede: o.epcRede != null ? decimalNum(o.epcRede) : null,
    cvrRede: o.cvrRede != null ? decimalNum(o.cvrRede) : null,
    refundPct: o.refundPct != null ? decimalNum(o.refundPct) : null,
    cpcMedioEsperado: o.cpcMedioEsperado != null ? decimalNum(o.cpcMedioEsperado) : null,
    volumeBuscaMensal: o.volumeBuscaMensal,
    brandBiddingPermitido: o.brandBiddingPermitido,
    keywordsPrioritarias: o.keywordsPrioritarias,
    scoreCalculado: o.scoreCalculado,
    completudeDados: o.completudeDados,
    statusDecisao: o.statusDecisao,
    budgetTesteAlocado: o.budgetTesteAlocado != null ? decimalNum(o.budgetTesteAlocado) : null,
    observacoes: o.observacoes,
    networkId: o.networkId,
    nextReviewAt: o.nextReviewAt ? o.nextReviewAt.toISOString() : null,
    domainUsed: o.domainUsed,
    termsVerifiedAt: o.termsVerifiedAt ? o.termsVerifiedAt.toISOString() : null,
    discoverySource: o.discoverySource,
  }))

  return <RadarClient initialOfertas={formatted} />
}
