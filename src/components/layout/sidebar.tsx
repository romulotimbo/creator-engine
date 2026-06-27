"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/", label: "Dashboard", icon: "◎" },
  { href: "/personas", label: "Personas", icon: "◉" },
  { href: "/calendario", label: "Calendário", icon: "◫" },
  { href: "/financeiro", label: "Financeiro", icon: "◈" },
  { href: "/discovery", label: "Discovery", icon: "◇" },
]

const CE_NAV = [
  { href: "/ferramentas", label: "Ferramentas", icon: "⚙" },
  { href: "/templates", label: "Templates", icon: "▤" },
  { href: "/sops", label: "SOPs", icon: "☑" },
  { href: "/prompts", label: "Prompts Globais", icon: "✦" },
  { href: "/analytics", label: "Analytics Global", icon: "◳" },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
      background: "#111118", borderRight: "1px solid #1e1e2e",
      display: "flex", flexDirection: "column", zIndex: 10
    }}>
      <div style={{ padding: "24px 20px", borderBottom: "1px solid #1e1e2e" }}>
        <p style={{ color: "#7c3aed", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Creator Engine</p>
        <p style={{ color: "#7d899c", fontSize: 11, marginTop: 2 }}>Operacao de Personas Digitais</p>
      </div>
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {NAV.map(item => renderItem(item, pathname))}
        <p style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "16px 12px 6px" }}>Creator Engine</p>
        {CE_NAV.map(item => renderItem(item, pathname))}
      </nav>
      <div style={{ padding: "12px 20px", borderTop: "1px solid #1e1e2e" }}>
        <p style={{ color: "#7d899c", fontSize: 11 }}>v0.1.0</p>
      </div>
    </aside>
  )
}

function renderItem(item: { href: string; label: string; icon: string }, pathname: string) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  return (
    <Link key={item.href} href={item.href}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        borderRadius: 8, marginBottom: 2, cursor: "pointer",
        background: active ? "#1e1e2e" : "transparent",
        color: active ? "#e2e8f0" : "#7d899c",
        transition: "all 0.15s"
      }}>
        <span style={{ fontSize: 16 }}>{item.icon}</span>
        <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>{item.label}</span>
        {active && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#7c3aed" }} />}
      </div>
    </Link>
  )
}
