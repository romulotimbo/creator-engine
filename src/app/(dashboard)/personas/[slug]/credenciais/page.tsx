import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import CredenciaisClient from "./CredenciaisClient"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"

export default async function CredenciaisPage({ params }: { params: Promise<{ slug: string }> }) {
  noStore()
  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) notFound()

  // Nunca enviar valorEnc ao client — só metadados
  const credenciais = await db.credencial.findMany({
    where: { personaId: persona.id },
    select: { id: true, chave: true, categoria: true, notas: true, global: true, createdAt: true },
    orderBy: { categoria: "asc" },
  })

  const logs = await db.credencialLog.findMany({
    where: { credencial: { personaId: persona.id } },
    orderBy: { data: "desc" },
    take: 15,
  })

  return (
    <div>
      <PersonaSectionHeader
        slug={slug}
        title="Credenciais"
        activeSegment="credenciais"
        description="Valores criptografados AES-256-GCM. Revelar exige senha mestra e fica registrado no audit log."
      />
      <CredenciaisClient
        personaId={persona.id}
        credenciais={credenciais.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
        logs={logs.map((l) => ({ acao: l.acao, credencialChave: l.credencialChave, usuarioEmail: l.usuarioEmail, data: l.data.toISOString() }))}
      />

      <div style={{ marginTop: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 12 }}>Configuração Técnica</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Dolphin Anty Profile: {persona.dolphinProfileId ?? "Não configurado"}</p>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 8 }}>Proxy IPRoyal: {persona.proxyRef ?? "Não configurado"}</p>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 8 }}>Disclosure IA: {persona.disclosureIa ? "✓ Ativo" : "✗ Não configurado"}</p>
      </div>
    </div>
  )
}
