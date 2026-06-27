import Link from "next/link"
import type { PersonaWithContas } from "@/types"
import { PERSONA_STATUS_LABELS, PLATAFORMA_LABELS, getProgressPercent } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  ATIVA: "#34d399", TESTE: "#60a5fa", SHADOW_BAN: "#f87171",
  SUSPENSA: "#fbbf24", BANIDA: "#94a3b8"
}

export default function PersonaCard({ persona }: { persona: PersonaWithContas }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>@{persona.slug}</p>
          <p style={{ color: "#7d899c", fontSize: 12, marginTop: 2 }}>{persona.nicho}</p>
        </div>
        <span style={{ padding: "3px 10px", background: STATUS_COLORS[persona.status] + "20", color: STATUS_COLORS[persona.status], borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
          {PERSONA_STATUS_LABELS[persona.status]}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {persona.contas.map(c => (
          <div key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#7d899c", fontSize: 12 }}>{PLATAFORMA_LABELS[c.plataforma]}</span>
              <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>
                {c.seguidoresAtual.toLocaleString("pt-BR")}
                {c.metaSeguidores ? ` / ${c.metaSeguidores.toLocaleString("pt-BR")}` : ""}
              </span>
            </div>
            {c.metaSeguidores && (
              <div style={{ background: "#1e1e2e", borderRadius: 4, height: 4, overflow: "hidden" }}>
                <div style={{ background: "#7c3aed", height: "100%", width: "100%", transformOrigin: "left", transform: `scaleX(${getProgressPercent(c.seguidoresAtual, c.metaSeguidores) / 100})`, transition: "transform 0.3s" }} />
              </div>
            )}
          </div>
        ))}
        {persona.contas.length === 0 && <p style={{ color: "#7d899c", fontSize: 12 }}>Sem contas cadastradas</p>}
      </div>

      <Link href={`/personas/${persona.slug}`} style={{ display: "block" }}>
        <button style={{ width: "100%", padding: "8px 0", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2d2d3f", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
          Abrir hub →
        </button>
      </Link>
    </div>
  )
}
