"use client"

import CredenciaisPanel, { type CredLog, type CredRow } from "@/components/credenciais/credenciais-panel"

export default function CredenciaisClient({
  personaId,
  credenciais,
  logs,
}: {
  personaId: string
  credenciais: CredRow[]
  logs: CredLog[]
}) {
  return (
    <CredenciaisPanel
      escopo="persona"
      personaId={personaId}
      credenciais={credenciais}
      logs={logs}
      showHeader={false}
    />
  )
}
