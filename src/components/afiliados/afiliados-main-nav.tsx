"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const MAIN_TABS = [
  { href: "/afiliados/radar", label: "🎯 Radar & Decisão de Ofertas" },
  { href: "/afiliados", label: "📢 Contas de Tráfego" },
  { href: "/afiliados/produtos", label: "📦 Catálogo de Produtos" },
]

export function AfiliadosMainNav() {
  const pathname = usePathname()

  return (
    <nav className="ce-persona-nav" style={{ marginBottom: "var(--space-md)", marginTop: "var(--space-sm)" }}>
      {MAIN_TABS.map((tab) => {
        const isActive = tab.href === "/afiliados" 
          ? pathname === "/afiliados" || pathname === "/afiliados/nova"
          : pathname.startsWith(tab.href)

        return (
          <Link key={tab.href} href={tab.href} data-active={isActive}>
            <button type="button" style={{ fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </button>
          </Link>
        )
      })}
    </nav>
  )
}
