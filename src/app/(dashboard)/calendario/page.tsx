import { db } from "@/lib/db"
import { formatDate, POST_STATUS_LABELS, TIPO_POST_LABELS } from "@/lib/utils"

export default async function CalendarioGlobalPage() {
  const posts = await db.post.findMany({
    where: { status: { in: ["AGENDADO", "APROVADO"] } },
    include: { persona: { select: { slug: true } } },
    orderBy: { dataPublicacao: "asc" },
  })

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Calendário</h1>
      <p style={{ color: "#7d899c", fontSize: 14, marginBottom: 32 }}>{posts.length} posts agendados ou aprovados</p>

      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["Data", "Persona", "Tipo", "Título", "Status"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#7d899c", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
                <td style={{ padding: "12px 16px", color: "#e2e8f0", fontSize: 13 }}>{formatDate(p.dataPublicacao)}</td>
                <td style={{ padding: "12px 16px", color: "#7c3aed", fontSize: 13 }}>@{p.persona.slug}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", background: "#1e1e2e", borderRadius: 4, fontSize: 12, color: "#94a3b8" }}>{TIPO_POST_LABELS[p.tipo]}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#e2e8f0", fontSize: 13, maxWidth: 300 }}>{p.titulo}</td>
                <td style={{ padding: "12px 16px", color: "#a78bfa", fontSize: 13 }}>{POST_STATUS_LABELS[p.status]}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: "center", color: "#7d899c" }}>Nenhum post agendado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
