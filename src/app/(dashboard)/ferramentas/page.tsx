import { db } from "@/lib/db"
import FerramentasClient from "./FerramentasClient"

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Ferramentas</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Assinaturas, custos e documentação — reutilizável entre personas</p>
      </div>
      <FerramentasClient initial={data} />
    </div>
  )
}
