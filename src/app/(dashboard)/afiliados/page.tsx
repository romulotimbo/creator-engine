import { db } from "@/lib/db"
import Link from "next/link"
import {
  PLATAFORMA_ADS_LABELS,
  STATUS_CONTA_TRAFEGO_LABELS,
} from "@/lib/afiliados"
import { PageHeader, Button, EmptyState, Surface } from "@/components/ui/primitives"

export default async function AfiliadosPage() {
  const contas = await db.contaTrafego.findMany({
    include: { _count: { select: { contasVinculadas: true, produtos: true, vendas: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title="Contas de tráfego"
        description={`${contas.length} conta(s) de anúncios`}
        actions={
          <>
            <Link href="/afiliados/produtos">
              <Button variant="ghost">Catálogo de produtos</Button>
            </Link>
            <Link href="/afiliados/nova">
              <Button>+ Nova conta</Button>
            </Link>
          </>
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
        {contas.map((c) => (
          <Link key={c.id} href={`/afiliados/${c.slug}`} style={{ textDecoration: "none" }}>
            <Surface style={{ height: "100%", transition: "border-color 0.15s" }}>
              <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 4 }}>{PLATAFORMA_ADS_LABELS[c.plataforma]}</p>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>{c.nome}</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>{c.slug}</p>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--faint)" }}>
                <span>{STATUS_CONTA_TRAFEGO_LABELS[c.status]}</span>
                <span>{c._count.produtos} produtos</span>
                <span>{c._count.vendas} vendas</span>
              </div>
            </Surface>
          </Link>
        ))}
        {contas.length === 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <EmptyState className="ce-animate-in">
              <p style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-sm)" }}>Nenhuma conta de tráfego</p>
              <Link href="/afiliados/nova" className="ce-link-accent">Criar primeira conta</Link>
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  )
}
