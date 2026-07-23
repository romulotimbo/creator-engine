import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { subDays } from "date-fns"
import { AfiliadoSectionHeader } from "@/components/afiliados/afiliado-section-header"
import {
  PLATAFORMA_ADS_LABELS,
  STATUS_CONTA_TRAFEGO_LABELS,
  decimalNum,
} from "@/lib/afiliados"
import { formatCurrency } from "@/lib/utils"
import { Button, Surface } from "@/components/ui/primitives"

export default async function ContaTrafegoHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const conta = await db.contaTrafego.findUnique({
    where: { slug },
    include: {
      _count: { select: { contasVinculadas: true, produtos: true, credenciais: true, vendas: true } },
    },
  })
  if (!conta) notFound()

  const desde = subDays(new Date(), 30)
  const [aprovadas30, aprovadasTotal, pendentes] = await Promise.all([
    db.vendaAfiliado.aggregate({
      where: { contaTrafegoId: conta.id, status: "APROVADA", data: { gte: desde } },
      _sum: { valorComissao: true },
      _count: true,
    }),
    db.vendaAfiliado.aggregate({
      where: { contaTrafegoId: conta.id, status: "APROVADA" },
      _sum: { valorComissao: true },
      _count: true,
    }),
    db.vendaAfiliado.count({ where: { contaTrafegoId: conta.id, status: "PENDENTE" } }),
  ])

  const stats = [
    { label: "Comissão 30d", value: formatCurrency(decimalNum(aprovadas30._sum.valorComissao)) },
    { label: "Comissão total", value: formatCurrency(decimalNum(aprovadasTotal._sum.valorComissao)) },
    { label: "Vendas aprovadas", value: String(aprovadasTotal._count) },
    { label: "Pendentes", value: String(pendentes) },
  ]

  return (
    <div>
      <AfiliadoSectionHeader
        slug={conta.slug}
        title={conta.nome}
        description={`${PLATAFORMA_ADS_LABELS[conta.plataforma]} · ${STATUS_CONTA_TRAFEGO_LABELS[conta.status]}`}
        activeSegment=""
        actions={
          <Link href={`/afiliados/${slug}/vendas`}>
            <Button>+ Lançar venda</Button>
          </Link>
        }
      />

      <div className="ce-stats-grid ce-animate-in" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-md)", marginBottom: "var(--space-2xl)" }}>
        {stats.map((s) => (
          <Surface key={s.label} style={{ padding: "var(--space-md)" }}>
            <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{s.value}</p>
          </Surface>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-md)" }}>
        {[
          { href: "contas", label: "Contas vinculadas", count: conta._count.contasVinculadas },
          { href: "produtos", label: "Produtos", count: conta._count.produtos },
          { href: "credenciais", label: "Credenciais", count: conta._count.credenciais },
          { href: "vendas", label: "Vendas", count: conta._count.vendas },
        ].map((s) => (
          <Link key={s.href} href={`/afiliados/${slug}/${s.href}`} style={{ textDecoration: "none" }}>
            <Surface>
              <p style={{ color: "var(--faint)", fontSize: 12 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 0" }}>{s.count}</p>
            </Surface>
          </Link>
        ))}
      </div>

      {conta.observacoes && (
        <Surface style={{ marginTop: "var(--space-xl)" }}>
          <p style={{ color: "var(--faint)", fontSize: 12, marginBottom: 8 }}>Observações</p>
          <p style={{ color: "var(--muted)", whiteSpace: "pre-wrap", margin: 0 }}>{conta.observacoes}</p>
        </Surface>
      )}
    </div>
  )
}
