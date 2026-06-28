"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

const SECTOR_MAP: Record<string, string> = {
  "/": "OPS-00 · DASHBOARD",
  "/personas": "PF-01 · PERSONAS",
  "/personas/nova": "PF-01 · NOVA PERSONA",
  "/calendario": "PF-02 · CALENDÁRIO",
  "/financeiro": "PF-03 · FINANCEIRO",
  "/discovery": "PF-04 · DISCOVERY",
  "/plano-de-ataque": "OPS-01 · PLANO DE ATAQUE",
  "/ferramentas": "CE-01 · FERRAMENTAS",
  "/templates": "CE-02 · TEMPLATES",
  "/sops": "CE-03 · SOPs",
  "/prompts": "CE-04 · PROMPTS",
  "/analytics": "CE-05 · ANALYTICS",
  "/perfil": "SYS · PERFIL",
}

function resolveSector(pathname: string): string {
  if (SECTOR_MAP[pathname]) return SECTOR_MAP[pathname]
  const personaMatch = pathname.match(/^\/personas\/([^/]+)(?:\/(.+))?$/)
  if (personaMatch) {
    const slug = personaMatch[1]
    const section = personaMatch[2]
    if (!section) return `PF · @${slug}`
    const sectionLabel = section.toUpperCase().replace(/-/g, " ")
    return `PF · @${slug} / ${sectionLabel}`
  }
  return "CE · SISTEMA"
}

export default function CommandHud() {
  const pathname = usePathname()
  const [clock, setClock] = useState("")

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="ce-command-hud" aria-label="Status do sistema">
      <div className="ce-command-hud-left">
        <span className="ce-hud-beacon" aria-hidden>
          <span className="ce-hud-pulse" />
        </span>
        <span className="ce-hud-status font-mono">SYS ONLINE</span>
        <span className="ce-hud-divider" aria-hidden />
        <span className="ce-hud-sector font-mono">{resolveSector(pathname)}</span>
      </div>
      <div className="ce-command-hud-right font-mono">
        <span className="ce-hud-label">LOCAL</span>
        <time dateTime={clock}>{clock || "—:—:—"}</time>
      </div>
    </div>
  )
}
