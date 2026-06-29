import { db } from "@/lib/db"
import FerramentasClient from "./FerramentasClient"
import { PageHeader } from "@/components/ui/primitives"
import { credSelect, serializeCredencial } from "@/lib/credenciais"

export const dynamic = "force-dynamic"

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

  const credenciais = await db.credencial.findMany({
    where: { global: true, personaId: null },
    select: credSelect,
    orderBy: { categoria: "asc" },
  })

  const logs = await db.credencialLog.findMany({
    where: { credencial: { global: true } },
    orderBy: { data: "desc" },
    take: 15,
  })

  return (
    <div>
      <PageHeader
        kicker="Creator Engine"
        title="Ferramentas"
        description="Assinaturas, custos, documentação e credenciais globais — reutilizável entre personas"
      />
      <FerramentasClient
        initial={data}
        credenciais={credenciais.map(serializeCredencial)}
        credenciaisLogs={logs.map((l) => ({
          acao: l.acao,
          credencialChave: l.credencialChave,
          usuarioEmail: l.usuarioEmail,
          data: l.data.toISOString(),
        }))}
        ferramentasOpts={data.map((f) => ({ id: f.id, nome: f.nome }))}
      />
    </div>
  )
}
