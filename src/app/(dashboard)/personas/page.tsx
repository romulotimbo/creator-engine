import { db } from "@/lib/db"
import Link from "next/link"
import PersonaCard from "@/components/personas/persona-card"
import { PageHeader, Button, EmptyState } from "@/components/ui/primitives"

export default async function PersonasPage() {
  const personas = await db.persona.findMany({
    include: { contas: true, _count: { select: { posts: true } } },
    orderBy: { dataCriacao: "desc" },
  })

  return (
    <div>
      <PageHeader
        kicker="PersonaForge"
        title="Personas"
        description={`${personas.length} persona(s) cadastrada(s)`}
        actions={
          <Link href="/personas/nova">
            <Button>+ Nova Persona</Button>
          </Link>
        }
      />

      <div
        className="ce-animate-in"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "var(--space-md)",
        }}
      >
        {personas.map(p => <PersonaCard key={p.id} persona={p} />)}
        {personas.length === 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <EmptyState className="ce-animate-in">
              <p style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-sm)" }}>Nenhuma persona cadastrada</p>
              <Link href="/personas/nova" className="ce-link-accent">Criar primeira persona</Link>
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  )
}
