import Link from "next/link"
import { tk } from "@/lib/tokens"

const AFILIADO_NAV = [
  { segment: "", label: "Hub" },
  { segment: "contas", label: "Contas" },
  { segment: "produtos", label: "Produtos" },
  { segment: "credenciais", label: "Credenciais" },
  { segment: "vendas", label: "Vendas" },
] as const

export function AfiliadoSectionHeader({
  slug,
  title,
  description,
  actions,
  activeSegment = "",
}: {
  slug: string
  title: string
  description?: string
  actions?: React.ReactNode
  activeSegment?: string
}) {
  return (
    <header className="ce-page-header ce-animate-in">
      <div style={{ width: "100%" }}>
        <nav className="ce-persona-crumb" aria-label="Breadcrumb">
          <Link href="/afiliados">Afiliados</Link>
          {" / "}
          <Link href={`/afiliados/${slug}`}>{slug}</Link>
          {title !== slug && (
            <>
              {" / "}
              <span>{title}</span>
            </>
          )}
        </nav>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <div>
            <h1
              className="font-display"
              style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: tk.fg, lineHeight: 1.1 }}
            >
              {title}
            </h1>
            {description && (
              <p style={{ color: tk.muted, fontSize: "var(--text-sm)", marginTop: "var(--space-xs)", maxWidth: "48ch" }}>
                {description}
              </p>
            )}
          </div>
          {actions && <div className="ce-page-header-actions">{actions}</div>}
        </div>
        <nav className="ce-persona-nav" aria-label={`Seções ${slug}`}>
          {AFILIADO_NAV.map((n) => {
            const href = n.segment ? `/afiliados/${slug}/${n.segment}` : `/afiliados/${slug}`
            return (
              <Link key={href} href={href} data-active={n.segment === activeSegment}>
                <button type="button">{n.label}</button>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
