import Link from "next/link"
import type { PersonaWithContas } from "@/types"
import { PERSONA_STATUS_LABELS, PLATAFORMA_LABELS, getProgressPercent } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  ATIVA: "#34d399", TESTE: "#60a5fa", SHADOW_BAN: "#f87171",
  SUSPENSA: "#fbbf24", BANIDA: "#94a3b8"
}

export default function PersonasTable({ personas }: { personas: PersonaWithContas[] }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
            {["Persona", "Status", "Nicho", "Plataformas / Seguidores", "Posts", ""].map(h => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#7d899c", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map(p => (
            <tr key={p.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
              <td style={{ padding: "14px 16px" }}>
                <p style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>@{p.slug}</p>
                <p style={{ color: "#7d899c", fontSize: 12 }}>{p.nomeArtistico}</p>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <span style={{ padding: "3px 10px", background: STATUS_COLORS[p.status] + "20", color: STATUS_COLORS[p.status], borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {PERSONA_STATUS_LABELS[p.status]}
                </span>
              </td>
              <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: 13, maxWidth: 200 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{p.nicho}</span>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {p.contas.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#7d899c", fontSize: 11, width: 70 }}>{PLATAFORMA_LABELS[c.plataforma]}</span>
                      <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{c.seguidoresAtual.toLocaleString("pt-BR")}</span>
                      {c.metaSeguidores && (
                        <span style={{ color: "#7d899c", fontSize: 11 }}>/ {c.metaSeguidores.toLocaleString("pt-BR")} ({getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}%)</span>
                      )}
                    </div>
                  ))}
                  {p.contas.length === 0 && <span style={{ color: "#7d899c", fontSize: 12 }}>Sem contas</span>}
                </div>
              </td>
              <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: 13 }}>
                {(p as any)._count?.posts ?? 0}
              </td>
              <td style={{ padding: "14px 16px" }}>
                <Link href={`/personas/${p.slug}`}>
                  <button style={{ padding: "6px 12px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                    Ver
                  </button>
                </Link>
              </td>
            </tr>
          ))}
          {personas.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#7d899c" }}>
              Nenhuma persona cadastrada. <Link href="/personas/nova" style={{ color: "#7c3aed" }}>Criar agora</Link>
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
