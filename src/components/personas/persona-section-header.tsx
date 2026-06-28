import Link from "next/link"
import { PersonaBreadcrumb } from "@/components/ui/primitives"
import { tk } from "@/lib/tokens"

const PERSONA_NAV = [
  { segment: "", label: "Hub" },
  { segment: "roteiros", label: "Roteiros" },
  { segment: "calendario", label: "Calendário" },
  { segment: "plano", label: "Plano" },
  { segment: "metricas", label: "Métricas" },
  { segment: "funil", label: "Funil" },
  { segment: "imagens", label: "Imagens" },
  { segment: "credenciais", label: "Credenciais" },
] as const

export function PersonaSectionHeader({
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
        <PersonaBreadcrumb slug={slug} section={title} />
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
        <nav className="ce-persona-nav" aria-label={`Seções @${slug}`}>
          {PERSONA_NAV.map(n => {
            const href = n.segment ? `/personas/${slug}/${n.segment}` : `/personas/${slug}`
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
