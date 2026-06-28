"use client"

import { useState } from "react"
import Sidebar from "@/components/layout/sidebar"
import CommandHud from "@/components/layout/command-hud"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="ce-app-shell ce-overdrive">
      <button
        type="button"
        className="ce-mobile-nav-toggle"
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(o => !o)}
      >
        <span aria-hidden />
        <span aria-hidden />
        <span aria-hidden />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="ce-sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <main className="ce-main">
        <CommandHud />
        <div className="ce-main-content">{children}</div>
      </main>
    </div>
  )
}
