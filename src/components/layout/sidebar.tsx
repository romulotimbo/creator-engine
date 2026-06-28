"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/", label: "Dashboard", short: "DB" },
  { href: "/plano-de-ataque", label: "Plano de Ataque", short: "PA" },
  { href: "/personas", label: "Personas", short: "PE" },
  { href: "/calendario", label: "Calendário", short: "CA" },
  { href: "/financeiro", label: "Financeiro", short: "FI" },
  { href: "/discovery", label: "Discovery", short: "DI" },
]

const CE_NAV = [
  { href: "/ferramentas", label: "Ferramentas", short: "FE" },
  { href: "/templates", label: "Templates", short: "TE" },
  { href: "/sops", label: "SOPs", short: "SO" },
  { href: "/prompts", label: "Prompts Globais", short: "PR" },
  { href: "/analytics", label: "Analytics Global", short: "AN" },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 248,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
      <div style={{ padding: "var(--space-lg) var(--space-md)", borderBottom: "1px solid var(--border)" }}>
        <p
          className="font-display"
          style={{
            color: "var(--accent)",
            fontWeight: 800,
            fontSize: "var(--text-lg)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Creator Engine
        </p>
        <p style={{ color: "var(--faint)", fontSize: "var(--text-xs)", marginTop: "var(--space-xs)" }}>
          Personas digitais
        </p>
      </div>

      <nav style={{ flex: 1, padding: "var(--space-sm)", overflowY: "auto" }}>
        <p className="ce-kicker" style={{ padding: "var(--space-sm) var(--space-sm) var(--space-xs)" }}>
          PersonaForge
        </p>
        {NAV.map(item => renderItem(item, pathname))}

        <p
          className="ce-kicker"
          style={{ padding: "var(--space-lg) var(--space-sm) var(--space-xs)" }}
        >
          Creator Engine
        </p>
        {CE_NAV.map(item => renderItem(item, pathname))}
      </nav>

      <div
        style={{
          padding: "var(--space-md)",
          borderTop: "1px solid var(--border)",
          fontSize: "var(--text-xs)",
          color: "var(--faint)",
        }}
      >
        v0.1.0 · solo ops · <Link href="/perfil" style={{ color: "var(--accent)" }}>Perfil</Link>
      </div>
    </aside>
  )
}

function renderItem(
  item: { href: string; label: string; short: string },
  pathname: string,
) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  return (
    <Link key={item.href} href={item.href} className="ce-nav-item" data-active={active}>
      <span
        aria-hidden
        className="font-display"
        style={{
          fontSize: "0.65rem",
          fontWeight: 800,
          color: active ? "var(--accent)" : "var(--faint)",
          width: "1.25rem",
          flexShrink: 0,
        }}
      >
        {item.short}
      </span>
      <span>{item.label}</span>
    </Link>
  )
}
