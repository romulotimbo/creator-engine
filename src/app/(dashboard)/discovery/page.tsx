import { db } from "@/lib/db"
import { formatDate } from "@/lib/utils"

const TIPO_COLORS: Record<string, string> = {
  IDEIA: "#60a5fa", EXPERIMENTO: "#a78bfa", PROJETO: "#34d399",
  TENDENCIA: "#fbbf24", APRENDIZADO: "#f87171"
}

const STATUS_COLORS: Record<string, string> = {
  EM_ABERTO: "#7d899c", EM_ANDAMENTO: "#60a5fa",
  CONCLUIDO: "#34d399", DESCARTADO: "#f87171"
}

export default async function DiscoveryPage() {
  const entries = await db.discoveryEntry.findMany({
    orderBy: { data: "desc" },
  })

  const porTipo = ["IDEIA","EXPERIMENTO","PROJETO","TENDENCIA","APRENDIZADO"].map(t => ({
    tipo: t, entries: entries.filter(e => e.tipo === t)
  }))

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Discovery</h1>
          <p style={{ color: "#7d899c", fontSize: 14 }}>Hub de ideias, experimentos e aprendizados</p>
        </div>
        <button style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Nova Entrada
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {porTipo.map(g => (
          <div key={g.tipo} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 8, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: TIPO_COLORS[g.tipo], display: "inline-block" }} />
            <span style={{ color: "#94a3b8", fontSize: 13 }}>{g.tipo}</span>
            <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>{g.entries.length}</span>
          </div>
        ))}
      </div>

      {/* Entries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {entries.map(e => (
          <div key={e.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ padding: "2px 8px", background: TIPO_COLORS[e.tipo] + "20", color: TIPO_COLORS[e.tipo], borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                {e.tipo}
              </span>
              <span style={{ padding: "2px 8px", background: STATUS_COLORS[e.status] + "20", color: STATUS_COLORS[e.status], borderRadius: 4, fontSize: 11 }}>
                {e.status.replace("_", " ")}
              </span>
            </div>
            <p style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{e.titulo}</p>
            {e.descricao && <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{e.descricao.slice(0, 120)}{e.descricao.length > 120 ? "..." : ""}</p>}
            <p style={{ color: "#7d899c", fontSize: 11 }}>{formatDate(e.data)}</p>
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 64, color: "#7d899c" }}>
            Nenhuma entrada de Discovery. Comece registrando uma ideia ou insight.
          </div>
        )}
      </div>
    </div>
  )
}
