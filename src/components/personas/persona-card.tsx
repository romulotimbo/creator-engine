import Link from "next/link"
import type { PersonaWithContas } from "@/types"
import { PERSONA_STATUS_LABELS, PLATAFORMA_LABELS, getProgressPercent, personaStatusBadgeStyle } from "@/lib/utils"
import { tk } from "@/lib/tokens"

export default function PersonaCard({ persona }: { persona: PersonaWithContas }) {
  return (
    <article
      className="ce-surface ce-animate-in"
      style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-sm)" }}>
        <div>
          <p className="font-display" style={{ fontWeight: 600, fontSize: "var(--text-base)", color: tk.fg }}>
            @{persona.slug}
          </p>
          <p style={{ color: tk.faint, fontSize: "var(--text-xs)", marginTop: 2 }}>{persona.nicho}</p>
        </div>
        <span style={personaStatusBadgeStyle(persona.status)}>
          {PERSONA_STATUS_LABELS[persona.status]}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {persona.contas.map(c => (
          <div key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="font-mono" style={{ color: tk.faint, fontSize: "var(--text-xs)" }}>
                {PLATAFORMA_LABELS[c.plataforma]}
              </span>
              <span className="font-mono" style={{ color: tk.cyan, fontSize: "var(--text-xs)", fontWeight: 600 }}>
                {c.seguidoresAtual.toLocaleString("pt-BR")}
                {c.metaSeguidores ? ` / ${c.metaSeguidores.toLocaleString("pt-BR")}` : ""}
              </span>
            </div>
            {c.metaSeguidores && (
              <div className="ce-progress-track">
                <div
                  className="ce-progress-fill"
                  style={{ width: `${getProgressPercent(c.seguidoresAtual, c.metaSeguidores)}%` }}
                />
              </div>
            )}
          </div>
        ))}
        {persona.contas.length === 0 && (
          <p style={{ color: tk.faint, fontSize: "var(--text-xs)" }}>Sem contas cadastradas</p>
        )}
      </div>

      <Link href={`/personas/${persona.slug}`} style={{ display: "block" }}>
        <button type="button" className="ce-btn ce-btn-ghost" style={{ width: "100%", fontSize: "var(--text-xs)" }}>
          Abrir hub →
        </button>
      </Link>
    </article>
  )
}
