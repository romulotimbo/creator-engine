import { db } from "@/lib/db"
import { serializeProdutoOperacional } from "@/lib/afiliados/produto"
import { alertaOrcamentoEstourado } from "@/lib/afiliados/rollups"
import CatalogoClient from "@/components/afiliados/produtos/CatalogoClient"

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

  return (
    <CatalogoClient
      produtos={produtos.map((p) => {
        const s = serializeProdutoOperacional(p)
        return {
          ...s,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          dataInicioTeste: p.dataInicioTeste?.toISOString() ?? null,
          dataUltimaAtualizacaoDados: p.dataUltimaAtualizacaoDados?.toISOString() ?? null,
          nextReviewAt: p.nextReviewAt?.toISOString() ?? null,
          domainReputation: p.domainUsed ? flaggedMap.get(p.domainUsed.toLowerCase()) ?? null : null,
          campanhas: p.campanhas.map((c) => ({
            ...c,
            budgetTesteAlocado: c.budgetTesteAlocado != null ? Number(c.budgetTesteAlocado) : null,
            alertaOrcamentoEstourado: alertaOrcamentoEstourado({
              gasto: c.snapshots[0]?.gasto ?? null,
              budget: c.budgetTesteAlocado,
              statusOperacional: c.status,
            }),
          })),
        }
      })}
    />
  )
}
