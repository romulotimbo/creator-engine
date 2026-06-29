import { db } from "@/lib/db"
import FerramentasClient from "./FerramentasClient"
import { PageHeader, Surface } from "@/components/ui/primitives"
import { credSelect, credSelectLegacy, globalCredenciaisWhere, serializeCredencial } from "@/lib/credenciais"
import { serializeFerramentas } from "@/lib/ferramentas"

export const dynamic = "force-dynamic"

async function loadCredenciaisGlobais() {
  const load = async (select: typeof credSelect | typeof credSelectLegacy) => {
    const credenciais = await db.credencial.findMany({
      where: globalCredenciaisWhere,
      select,
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
  }

  try {
    return await load(credSelect)
  } catch (e: unknown) {
    try {
      return await load(credSelectLegacy)
    } catch {
      const msg = e instanceof Error ? e.message : "Erro ao carregar credenciais"
      return { credenciais: [], credenciaisLogs: [], credenciaisError: msg }
    }
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
  const personaCredCount = await db.credencial.count({ where: { personaId: { not: null } } })
  const showPersonaCredHint = credBlock.credenciais.length === 0 && personaCredCount > 0 && !credBlock.credenciaisError

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
        personaCredHint={showPersonaCredHint ? personaCredCount : 0}
      />
    </div>
  )
}
