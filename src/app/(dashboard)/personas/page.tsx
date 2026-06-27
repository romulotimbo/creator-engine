import { db } from "@/lib/db"
import Link from "next/link"
import PersonaCard from "@/components/personas/persona-card"

export default async function PersonasPage() {
  const personas = await db.persona.findMany({
    include: { contas: true, _count: { select: { posts: true } } },
    orderBy: { dataCriacao: "desc" },
  })

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Personas</h1>
          <p style={{ color: "#7d899c", fontSize: 14 }}>{personas.length} persona(s) cadastrada(s)</p>
        </div>
        <Link href="/personas/nova">
          <button style={{
            padding: "10px 20px", background: "#7c3aed", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>
            + Nova Persona
          </button>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {personas.map(p => <PersonaCard key={p.id} persona={p} />)}
        {personas.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 64, color: "#7d899c" }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>Nenhuma persona cadastrada</p>
            <Link href="/personas/nova" style={{ color: "#7c3aed" }}>Criar primeira persona</Link>
          </div>
        )}
      </div>
    </div>
  )
}
