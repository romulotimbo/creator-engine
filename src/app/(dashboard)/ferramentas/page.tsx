import { db } from "@/lib/db"
import FerramentasClient from "./FerramentasClient"
import { PageHeader } from "@/components/ui/primitives"

export default async function FerramentasPage() {
  const ferramentas = await db.ferramenta.findMany({ orderBy: { nome: "asc" } })

  const data = ferramentas.map((f) => ({
    id: f.id,
    nome: f.nome,
    categoria: f.categoria,
    urlAcesso: f.urlAcesso,
    versaoAtual: f.versaoAtual,
    statusAssinatura: f.statusAssinatura,
    custoMensal: f.custoMensal != null ? Number(f.custoMensal) : null,
    dataRenovacao: f.dataRenovacao ? f.dataRenovacao.toISOString() : null,
    responsavelConta: f.responsavelConta,
    documentacao: f.documentacao,
    tags: f.tags,
  }))

  return (
    <div>
      <PageHeader
        kicker="Creator Engine"
        title="Ferramentas"
        description="Assinaturas, custos e documentação — reutilizável entre personas"
      />
      <FerramentasClient initial={data} />
    </div>
  )
}
