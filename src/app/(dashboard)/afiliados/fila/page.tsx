import { db } from "@/lib/db"
import { PageHeader } from "@/components/ui/primitives"
import { AfiliadosMainNav } from "@/components/afiliados/afiliados-main-nav"
import { STATUS_ITEM_FILA_TERMINAIS } from "@/lib/afiliados/fila"
import FilaClient from "./FilaClient"

const PRIORIDADE_ORDEM: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 }

export default async function FilaPage() {
  const itens = await db.itemFila.findMany({
    where: { status: { notIn: [...STATUS_ITEM_FILA_TERMINAIS] } },
    orderBy: { createdAt: "desc" },
  })
  itens.sort((a, b) => PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade])

  const campanhaIds = itens.filter((i) => i.tipoAlvo === "CAMPANHA").map((i) => i.alvoId)
  const ofertaIds = itens.filter((i) => i.tipoAlvo === "OFERTA").map((i) => i.alvoId)

  const [campanhas, ofertas] = await Promise.all([
    db.campanha.findMany({
      where: { id: { in: campanhaIds } },
      select: { id: true, nomeCampanhaGoogleAds: true, produto: { select: { nome: true } } },
    }),
    db.ofertaDecisao.findMany({ where: { id: { in: ofertaIds } }, select: { id: true, nome: true } }),
  ])

  const labelPorAlvo = new Map<string, string>()
  for (const c of campanhas) labelPorAlvo.set(c.id, `${c.nomeCampanhaGoogleAds} · ${c.produto.nome}`)
  for (const o of ofertas) labelPorAlvo.set(o.id, o.nome)

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title="Fila de decisão"
        description={`${itens.length} item(ns) aguardando confirmação`}
      />
      <AfiliadosMainNav />
      <FilaClient
        itens={itens.map((i) => ({
          id: i.id,
          tipoAlvo: i.tipoAlvo,
          alvoId: i.alvoId,
          alvoLabel: labelPorAlvo.get(i.alvoId) || i.alvoId,
          regra: i.regra,
          prioridade: i.prioridade,
          resumo: i.resumo,
          status: i.status,
          evidencia: i.evidencia as Record<string, unknown> | null,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
