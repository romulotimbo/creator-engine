import { db } from "@/lib/db"
import FerramentasClient from "./FerramentasClient"
import { PageHeader, Surface } from "@/components/ui/primitives"
import { credSelect, globalCredenciaisWhere, serializeCredencial } from "@/lib/credenciais"
import { serializeFerramentas } from "@/lib/ferramentas"

export const dynamic = "force-dynamic"

async function loadCredenciaisGlobais() {
  try {
    const credenciais = await db.credencial.findMany({
      where: globalCredenciaisWhere,
      select: credSelect,
      orderBy: { categoria: "asc" },
    })
    const logs = await db.credencialLog.findMany({
      where: { credencial: globalCredenciaisWhere },
      orderBy: { data: "desc" },
      take: 15,
    })
    return {
      credenciais: credenciais.map(serializeCredencial),
      credenciaisLogs: logs.map((l) => ({
        acao: l.acao,
        credencialChave: l.credencialChave,
        usuarioEmail: l.usuarioEmail,
        data: l.data.toISOString(),
      })),
      credenciaisError: null as string | null,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar credenciais"
    return { credenciais: [], credenciaisLogs: [], credenciaisError: msg }
  }
}

export default async function FerramentasPage() {
  let data: Awaited<ReturnType<typeof serializeFerramentas>> = []
  let ferramentasError: string | null = null
  try {
    const ferramentas = await db.ferramenta.findMany({ orderBy: { nome: "asc" } })
    data = serializeFerramentas(ferramentas)
  } catch (e: unknown) {
    ferramentasError = e instanceof Error ? e.message : "Erro ao carregar ferramentas"
  }
  const credBlock = await loadCredenciaisGlobais()

  return (
    <div>
      <PageHeader
        kicker="Creator Engine"
        title="Ferramentas"
        description="Assinaturas, custos, documentação e credenciais globais — reutilizável entre personas"
      />
      {ferramentasError && (
        <Surface style={{ marginBottom: "var(--space-md)", borderColor: "var(--warning)" }}>
          <p style={{ color: "var(--warning)", fontSize: 13, margin: 0 }}>
            Falha ao carregar ferramentas do banco. Verifique o schema <code>creator_engine</code> e dados legados (tags nulas).
          </p>
          <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8, marginBottom: 0 }}>{ferramentasError}</p>
        </Surface>
      )}
      <FerramentasClient
        key={data.map((f) => f.id).join(",") || "empty"}
        initial={data}
        credenciais={credBlock.credenciais}
        credenciaisLogs={credBlock.credenciaisLogs}
        credenciaisError={credBlock.credenciaisError}
      />
      {credBlock.credenciaisError && (
        <Surface style={{ marginTop: "var(--space-md)", borderColor: "var(--warning)" }}>
          <p style={{ color: "var(--warning)", fontSize: 13, margin: 0 }}>
            Credenciais globais indisponíveis: migration pendente. Rode <code>prisma db push</code> ou os scripts em <code>prisma/sql/</code>.
          </p>
          <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8, marginBottom: 0 }}>{credBlock.credenciaisError}</p>
        </Surface>
      )}
    </div>
  )
}
