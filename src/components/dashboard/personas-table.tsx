import Link from "next/link"
import type { PersonaWithContas } from "@/types"
import { PERSONA_STATUS_LABELS, PLATAFORMA_LABELS, getProgressPercent } from "@/lib/utils"
import { tk } from "@/lib/tokens"

const STATUS_COLORS: Record<string, string> = {
  ATIVA: "var(--success)",
  TESTE: "var(--warning)",
  SHADOW_BAN: "var(--danger)",
  SUSPENSA: "var(--warning)",
  BANIDA: "var(--faint)",
}

export default function PersonasTable({ personas }: { personas: PersonaWithContas[] }) {
  return (
    <div className="ce-surface ce-data-table ce-animate-in" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tk.border}` }}>
            {["Persona", "Status", "Nicho", "Plataformas / Seguidores", "Posts", ""].map(h => (
              <th
                key={h}
                className="ce-kicker"
                style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.65rem" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map(p => (
            <tr
              key={p.id}
              style={{
                borderBottom: `1px solid ${tk.border}`,
                background: p.status === "SHADOW_BAN"
                  ? "color-mix(in oklch, var(--danger) 6%, transparent)"
                  : undefined,
              }}
            >
              <td style={{ padding: "0.875rem 1rem" }}>
                <p className="font-display" style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                  @{p.slug}
                </p>
                <p style={{ color: tk.muted, fontSize: "var(--text-xs)" }}>{p.nomeArtistico}</p>
              </td>
              <td style={{ padding: "0.875rem 1rem" }}>
                <span
                  className="font-mono"
                  style={{
                    padding: "0.15rem 0.5rem",
                    background: `color-mix(in oklch, ${STATUS_COLORS[p.status]} 14%, transparent)`,
                    color: STATUS_COLORS[p.status],
                    borderRadius: "var(--radius)",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {PERSONA_STATUS_LABELS[p.status]}
                </span>
              </td>
              <td style={{ padding: "0.875rem 1rem", color: tk.muted, fontSize: "var(--text-sm)", maxWidth: 200 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {p.nicho}
                </span>
              </td>
              <td style={{ padding: "0.875rem 1rem" }} data-mono="true">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {p.contas.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: tk.faint, width: 70 }}>
                        {PLATAFORMA_LABELS[c.plataforma]}
                      </span>
                      <span style={{ fontWeight: 600, color: tk.cyan }}>
                        {c.seguidoresAtual.toLocaleString("pt-BR")}
                      </span>
                      {c.metaSeguidores && (
                        <span style={{ color: tk.faint }}>
                          / {c.metaSeguidores.toLocaleString("pt-BR")} ({getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}%)
                        </span>
                      )}
                    </div>
                  ))}
                  {p.contas.length === 0 && (
                    <span style={{ color: tk.faint }}>Sem contas</span>
                  )}
                </div>
              </td>
              <td style={{ padding: "0.875rem 1rem", color: tk.muted }} data-mono="true">
                {(p as PersonaWithContas & { _count?: { posts: number } })._count?.posts ?? 0}
              </td>
              <td style={{ padding: "0.875rem 1rem" }}>
                <Link href={`/personas/${p.slug}`}>
                  <button type="button" className="ce-btn ce-btn-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "var(--text-xs)" }}>
                    Ver
                  </button>
                </Link>
              </td>
            </tr>
          ))}
          {personas.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: tk.muted }}>
                Nenhuma persona cadastrada.{" "}
                <Link href="/personas/nova" style={{ color: tk.accent, fontWeight: 600 }}>
                  Criar agora
                </Link>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
