"use client"

import { useEffect, useState } from "react"
import { Modal, ModalHeader, Badge } from "@/components/ui/primitives"
import { apiUrl } from "@/lib/api-url"
import { REPUTATION_STATUS_LABELS } from "@/lib/afiliados"
import { formatDate } from "@/lib/utils"

interface DomainLogEntry {
  id: string
  domain: string
  usedFrom: string
  usedUntil: string | null
  reputationStatus: "ok" | "flagged" | "burned"
  oferta: { id: string; nome: string }
}

/**
 * View de domínios problemáticos (domain-usage-history).
 * Lista todo o histórico com reputationStatus IN (flagged, burned),
 * agrupado por domínio, e permite reclassificar manualmente.
 */
export function ModalDominiosProblematicos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<DomainLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(apiUrl("/api/afiliados/domains?reputationStatus=flagged,burned"))
      if (res.ok) setLogs(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  async function updateStatus(logId: string, reputationStatus: "ok" | "flagged" | "burned") {
    setSavingId(logId)
    try {
      const res = await fetch(apiUrl(`/api/afiliados/domains/${logId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reputationStatus }),
      })
      if (res.ok) await load()
    } finally {
      setSavingId(null)
    }
  }

  const grouped = logs.reduce<Record<string, DomainLogEntry[]>>((acc, log) => {
    acc[log.domain] = acc[log.domain] || []
    acc[log.domain].push(log)
    return acc
  }, {})

  return (
    <Modal open={open} onClose={onClose} maxWidth="36rem">
      <ModalHeader title="Domínios com Reputação Negativa" onClose={onClose} />

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Carregando…</p>
      ) : logs.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Nenhum domínio marcado como sinalizado ou queimado até o momento.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "60vh", overflowY: "auto" }}>
          {Object.entries(grouped).map(([domain, entries]) => (
            <div key={domain} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--foreground)" }}>{domain}</div>
              {entries.map((log) => (
                <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "4px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ color: "var(--foreground)" }}>{log.oferta.nome}</span>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
                      {formatDate(log.usedFrom)} {log.usedUntil ? `— ${formatDate(log.usedUntil)}` : "(em uso)"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Badge variant={log.reputationStatus === "burned" ? "danger" : "warning"} style={{ fontSize: 10 }}>
                      {REPUTATION_STATUS_LABELS[log.reputationStatus]}
                    </Badge>
                    <select
                      value={log.reputationStatus}
                      disabled={savingId === log.id}
                      onChange={(e) => updateStatus(log.id, e.target.value as "ok" | "flagged" | "burned")}
                      style={{
                        padding: "3px 6px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--surface-raised)",
                        color: "var(--foreground)",
                        fontSize: 11,
                      }}
                    >
                      <option value="ok">OK</option>
                      <option value="flagged">Sinalizado</option>
                      <option value="burned">Queimado</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
