"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Target,
  Users,
  Calendar,
  DollarSign,
  Lightbulb,
  Wrench,
  FileText,
  ListChecks,
  MessageSquare,
  BarChart3,
  User,
  type LucideIcon,
} from "lucide-react"

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plano-de-ataque", label: "Plano de Ataque", icon: Target },
  { href: "/personas", label: "Personas", icon: Users },
  { href: "/calendario", label: "Calendário", icon: Calendar },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/discovery", label: "Discovery", icon: Lightbulb },
]

const CE_NAV: NavItem[] = [
  { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/sops", label: "SOPs", icon: ListChecks },
  { href: "/prompts", label: "Prompts Globais", icon: MessageSquare },
  { href: "/analytics", label: "Analytics Global", icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="ce-sidebar" aria-label="Navegação principal">
      <div className="ce-sidebar-logo">
        <span className="ce-sidebar-logo-mark" aria-hidden>CE</span>
        <div className="ce-sidebar-logo-text">
          <p className="ce-sidebar-logo-title">Creator Engine</p>
          <p className="ce-sidebar-logo-sub">Personas digitais</p>
        </div>
      </div>

      <nav className="ce-sidebar-nav">
        <p className="ce-sidebar-section">PersonaForge</p>
        {NAV.map(item => renderItem(item, pathname))}

        <p className="ce-sidebar-section">Creator Engine</p>
        {CE_NAV.map(item => renderItem(item, pathname))}
      </nav>

      <div className="ce-sidebar-footer">
        <Link href="/perfil" className="ce-nav-item" style={{ marginBottom: 0, padding: "0.4rem 0.5rem" }}>
          <span className="ce-nav-icon" aria-hidden>
            <User size={18} strokeWidth={1.75} />
          </span>
          <span className="ce-nav-label">Perfil · v0.1.0</span>
        </Link>
      </div>
    </aside>
  )
}

function renderItem(item: NavItem, pathname: string) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      key={item.href}
      href={item.href}
      className="ce-nav-item"
      data-active={active}
      title={item.label}
    >
      <span className="ce-nav-icon" aria-hidden>
        <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
      </span>
      <span className="ce-nav-label">{item.label}</span>
    </Link>
  )
}
