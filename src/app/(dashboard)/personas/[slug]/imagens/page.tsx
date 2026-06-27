import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function ImagensPage({ params }: { params: { slug: string } }) {
  const persona = await db.persona.findUnique({ where: { slug: params.slug } })
  if (!persona) notFound()

  const imagens = await db.imagemGerada.findMany({
    where: { personaId: persona.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 8 }}>
        <Link href={`/personas/${params.slug}`} style={{ color: "#7c3aed" }}>@{params.slug}</Link>{" / Imagens"}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 32 }}>Imagens Geradas ({imagens.length})</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {imagens.map(img => (
          <div key={img.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20 }}>
            {img.resultado && (
              <div style={{ aspectRatio: "1", background: "#1e1e2e", borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
                <img src={img.resultado} alt="Imagem gerada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{img.ferramenta} · {formatDate(img.createdAt)}</p>
            <p style={{ color: "#7d899c", fontSize: 12, lineHeight: 1.5 }}>{img.prompt.slice(0, 100)}...</p>
            <div style={{ marginTop: 8 }}>
              <span style={{ padding: "2px 8px", background: img.status === "aprovada" ? "#34d39920" : "#7d899c20", color: img.status === "aprovada" ? "#34d399" : "#7d899c", borderRadius: 4, fontSize: 11 }}>
                {img.status}
              </span>
            </div>
          </div>
        ))}
        {imagens.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 64, color: "#7d899c" }}>
            Nenhuma imagem gerada ainda. Registre tentativas de geração aqui.
          </div>
        )}
      </div>
    </div>
  )
}
