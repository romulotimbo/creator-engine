import { db } from "@/lib/db"
import { serializeProdutoOperacional } from "@/lib/afiliados/produto"
import { alertaOrcamentoEstourado } from "@/lib/afiliados/rollups"
import CatalogoClient, { type CatalogoProduto } from "@/components/afiliados/produtos/CatalogoClient"

export default async function CatalogoProdutosPage() {
  const produtos = await db.produtoAfiliado.findMany({
    include: {
      _count: { select: { contas: true, vendas: true, campanhas: true } },
      ofertaDecisao: { select: { id: true, nome: true, vertical: true } },
      campanhas: {
        select: {
          id: true,
          nomeContaAds: true,
          nomeCampanhaGoogleAds: true,
          geo: true,
          papelConta: true,
          status: true,
          motivoEncerramento: true,
          budgetTesteAlocado: true,
          contaTrafego: { select: { id: true, nome: true, slug: true } },
          snapshots: { orderBy: { dataSnapshot: "desc" }, take: 1, select: { gasto: true } },
        },
      },
    },
    orderBy: { nome: "asc" },
  })

  const flagged = await db.domainUsageLog.findMany({
    where: { reputationStatus: { in: ["flagged", "burned"] } },
    select: { domain: true, reputationStatus: true },
  })
  const flaggedMap = new Map(flagged.map((d) => [d.domain.toLowerCase(), d.reputationStatus]))

  const payload: CatalogoProduto[] = produtos.map((p) => {
    const s = serializeProdutoOperacional(p)
    return {
      id: p.id,
      slug: p.slug,
      nome: p.nome,
      plataformaAfil: p.plataformaAfil,
      preco: s.preco,
      comissaoPercent: s.comissaoPercent,
      comissaoValor: s.comissaoValor,
      linkCheckout: p.linkCheckout,
      linkLanding: p.linkLanding,
      status: p.status,
      statusOperacional: p.statusOperacional,
      observacoes: p.observacoes,
      ofertaDecisaoId: p.ofertaDecisaoId,
      ofertaDecisao: p.ofertaDecisao,
      conversionPoint: p.conversionPoint,
      tipoProduto: p.tipoProduto,
      ltvEstimadoRebill: s.ltvEstimadoRebill,
      scoreOrigem: p.scoreOrigem,
      budgetTesteAlocado: s.budgetTesteAlocado,
      cpaAlvoBreakeven: s.cpaAlvoBreakeven,
      gastoTotalAcumulado: s.gastoTotalAcumulado,
      receitaConfirmadaAcumulada: s.receitaConfirmadaAcumulada,
      roiReal: s.roiReal,
      cpaReal: s.cpaReal,
      percentualBudgetConsumido: s.percentualBudgetConsumido,
      alertaOrcamentoEstourado: s.alertaOrcamentoEstourado,
      dataInicioTeste: p.dataInicioTeste?.toISOString() ?? null,
      dataUltimaAtualizacaoDados: p.dataUltimaAtualizacaoDados?.toISOString() ?? null,
      nextReviewAt: p.nextReviewAt?.toISOString() ?? null,
      domainUsed: p.domainUsed,
      domainReputation: p.domainUsed ? flaggedMap.get(p.domainUsed.toLowerCase()) ?? null : null,
      moeda: p.moeda,
      criterioPausa: p.criterioPausa,
      criterioEscala: p.criterioEscala,
      campanhas: p.campanhas.map((c) => ({
        id: c.id,
        nomeContaAds: c.nomeContaAds,
        nomeCampanhaGoogleAds: c.nomeCampanhaGoogleAds,
        geo: c.geo,
        papelConta: c.papelConta,
        status: c.status,
        motivoEncerramento: c.motivoEncerramento,
        alertaOrcamentoEstourado: alertaOrcamentoEstourado({
          gasto: c.snapshots[0]?.gasto ?? null,
          budget: c.budgetTesteAlocado,
          statusOperacional: c.status,
        }),
        contaTrafego: c.contaTrafego,
      })),
      _count: p._count,
    }
  })

  return <CatalogoClient produtos={payload} />
}
