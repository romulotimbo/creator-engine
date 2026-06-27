import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import CredenciaisClient from "./CredenciaisClient"

export default async function CredenciaisPage({ params }: { params: Promise<{ slug: string }> }) {
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
      <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 8 }}>
        <Link href={`/personas/${slug}`} style={{ color: "#7c3aed" }}>@{slug}</Link>{" / Credenciais"}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Credenciais</h1>
      <p style={{ color: "#f87171", fontSize: 13, marginBottom: 24 }}>
        ⚠ Valores criptografados com AES-256-GCM. Revelar exige a senha mestra (sua senha de conta) e fica registrado.
      </p>

      <CredenciaisClient
        personaId={persona.id}
        credenciais={credenciais.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
        logs={logs.map((l) => ({ acao: l.acao, credencialChave: l.credencialChave, usuarioEmail: l.usuarioEmail, data: l.data.toISOString() }))}
      />

      <div style={{ marginTop: 24, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Configuração Técnica</h2>
        <p style={{ color: "#94a3b8", fontSize: 13 }}>Dolphin Anty Profile: {persona.dolphinProfileId ?? "Não configurado"}</p>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>Proxy IPRoyal: {persona.proxyRef ?? "Não configurado"}</p>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>Disclosure IA: {persona.disclosureIa ? "✓ Ativo" : "✗ Não configurado"}</p>
      </div>
    </div>
  )
}
