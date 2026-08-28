import { db } from "@/lib/db"
import { PageHeader } from "@/components/ui/primitives"
import { AfiliadosMainNav } from "@/components/afiliados/afiliados-main-nav"
import NaoReconciliadosClient from "./NaoReconciliadosClient"

export default async function NaoReconciliadosPage() {
  const [itens, campanhas] = await Promise.all([
    db.campanhaNaoReconciliada.findMany({
      where: { resolvidoEm: null },
      orderBy: { createdAt: "desc" },
    }),
    db.campanha.findMany({
      select: {
        id: true,
        nomeCampanhaGoogleAds: true,
        produto: { select: { nome: true } },
        contaTrafego: { select: { nome: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
  ])

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title="Bandeja de não-reconciliados"
        description={`${itens.length} linha(s) do envelope de ingestão sem Campanha correspondente`}
      />
      <AfiliadosMainNav />
      <NaoReconciliadosClient
        itens={itens.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
          linhaBruta: i.linhaBruta as Record<string, unknown>,
        }))}
        campanhas={campanhas.map((c) => ({
          id: c.id,
          label: `${c.nomeCampanhaGoogleAds} · ${c.produto.nome}${c.contaTrafego ? " · " + c.contaTrafego.nome : ""}`,
        }))}
      />
    </div>
  )
}
