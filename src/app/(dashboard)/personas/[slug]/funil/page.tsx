import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"

export default async function FunilPage({ params }: { params: { slug: string } }) {
  const persona = await db.persona.findUnique({ where: { slug: params.slug } })
  if (!persona) notFound()

  const funil = await db.funilMonetizacao.findUnique({
    where: { personaId: persona.id },
    include: { checklistItems: { orderBy: { ordem: "asc" } } },
  })

  return (
    <div>
      <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 8 }}>
        <Link href={`/personas/${params.slug}`} style={{ color: "#7c3aed" }}>@{params.slug}</Link>{" / Funil"}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 32 }}>Funil de Monetização</h1>

      {!funil ? (
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <p style={{ color: "#7d899c", marginBottom: 16 }}>Nenhum funil configurado para esta persona.</p>
          <button style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
            Configurar Funil
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Landing Page</h2>
            <p style={{ color: "#94a3b8", fontSize: 13 }}>URL: {funil.urlLandingPage ?? "—"}</p>
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Status: {funil.statusDeploy}</p>
          </div>
          <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Checklist</h2>
            {funil.checklistItems.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #1e1e2e" }}>
                <span style={{ width: 20, height: 20, borderRadius: 4, background: item.concluido ? "#34d399" : "#1e1e2e", border: "1px solid #2d2d3f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                  {item.concluido ? "✓" : ""}
                </span>
                <span style={{ color: item.concluido ? "#7d899c" : "#e2e8f0", fontSize: 13, textDecoration: item.concluido ? "line-through" : "none" }}>
                  [{item.bloco}] {item.descricao}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
