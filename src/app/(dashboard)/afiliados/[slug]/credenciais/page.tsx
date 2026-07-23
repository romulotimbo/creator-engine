import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AfiliadoSectionHeader } from "@/components/afiliados/afiliado-section-header"
import CredenciaisPanel from "@/components/credenciais/credenciais-panel"
import { credSelect, serializeCredencial } from "@/lib/credenciais"

export default async function CredenciaisAfiliadoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const conta = await db.contaTrafego.findUnique({ where: { slug } })
  if (!conta) notFound()

  let credenciais: ReturnType<typeof serializeCredencial>[] = []
  let logs: { acao: string; credencialChave: string; usuarioEmail: string; data: string }[] = []
  let loadError: string | null = null

  try {
    const rows = await db.credencial.findMany({
      where: { contaTrafegoId: conta.id, global: false, personaId: null },
      select: credSelect,
      orderBy: { categoria: "asc" },
    })
    credenciais = rows.map(serializeCredencial)

    const rawLogs = await db.credencialLog.findMany({
      where: { credencial: { contaTrafegoId: conta.id } },
      orderBy: { data: "desc" },
      take: 30,
    })
    logs = rawLogs.map((l) => ({
      acao: l.acao,
      credencialChave: l.credencialChave,
      usuarioEmail: l.usuarioEmail,
      data: l.data.toISOString(),
    }))
  } catch (e: unknown) {
    loadError = e instanceof Error ? e.message : "Erro ao carregar"
  }

  return (
    <div>
      <AfiliadoSectionHeader
        slug={slug}
        title="Credenciais"
        description={`Escopo desta conta de tráfego · ${conta.nome}`}
        activeSegment="credenciais"
      />
      <CredenciaisPanel
        escopo="contaTrafego"
        contaTrafegoId={conta.id}
        credenciais={credenciais}
        logs={logs}
        loadError={loadError}
      />
    </div>
  )
}
