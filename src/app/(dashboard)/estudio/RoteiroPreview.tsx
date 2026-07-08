"use client"

import { useMemo, useState } from "react"
import { COLORS, TYPOGRAPHY, FORMATOS, type FormatoId } from "../../../../brand/tokens"
import type { Timeline } from "@/lib/estudio/timeline"
import { tk } from "@/lib/tokens"

/**
 * Preview leve (rascunho) do roteiro — aproximação em DOM da identidade Tactical
 * Rebel, sem puxar o Remotion para o bundle do client (decisão de design).
 * Mostra as tracks ativas no tempo corrente sobre um canvas preto com scrubber.
 */
export default function RoteiroPreview({
  timeline,
  formato,
  larguraPx = 300,
}: {
  timeline: Timeline
  formato: FormatoId
  larguraPx?: number
}) {
  const fmt = FORMATOS[formato]
  const duracao = useMemo(
    () => Math.max(1, ...timeline.tracks.map((t) => t.fim)),
    [timeline]
  )
  const [t, setT] = useState(0)

  const alturaPx = Math.round(larguraPx * (fmt.height / fmt.width))
  const scaleY = alturaPx / fmt.height
  const ativas = timeline.tracks.filter((tr) => t >= tr.inicio && t < tr.fim)

  const justify = (pos: string) =>
    pos === "safe-top" ? "flex-start" : pos === "safe-bottom" ? "flex-end" : "center"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          position: "relative",
          width: larguraPx,
          height: alturaPx,
          background: COLORS.pretoProfundo,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${tk.border}`,
          alignSelf: "center",
        }}
      >
        {/* scrim */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.5))" }} />
        {/* safe zone guides */}
        <div
          style={{
            position: "absolute",
            left: fmt.safe.sideMargin * (larguraPx / fmt.width),
            right: fmt.safe.sideMargin * (larguraPx / fmt.width),
            top: fmt.safe.top * scaleY,
            height: (fmt.safe.bottom - fmt.safe.top) * scaleY,
            border: `1px dashed ${tk.border}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {["safe-top", "safe-center", "safe-bottom"].map((pos) => {
            const nesta = ativas.filter((tr) => tr.posicao === pos)
            return (
              <div key={pos} style={{ flex: 1, display: "flex", alignItems: justify(pos), justifyContent: "center", flexDirection: "column", gap: 4 }}>
                {nesta.map((tr, i) =>
                  tr.tipo === "texto" ? (
                    <span
                      key={i}
                      style={{
                        textAlign: "center",
                        color: tr.estilo === "conviccao" ? TYPOGRAPHY.conviccao.color : TYPOGRAPHY.impacto.color,
                        fontFamily:
                          tr.estilo === "conviccao"
                            ? `"${TYPOGRAPHY.conviccao.fontFamily}", serif`
                            : `"${TYPOGRAPHY.impacto.fontFamily}", sans-serif`,
                        textTransform: tr.estilo === "conviccao" ? "none" : "uppercase",
                        fontStyle: tr.estilo === "conviccao" ? "italic" : "normal",
                        fontWeight: 700,
                        fontSize: tr.estilo === "conviccao" ? 15 : 24,
                        lineHeight: 1.05,
                        textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                        padding: "0 6px",
                      }}
                    >
                      {tr.conteudo}
                    </span>
                  ) : (
                    <span
                      key={i}
                      style={{
                        fontSize: 10,
                        color: COLORS.douradoEnvelhecido,
                        border: `1px solid ${COLORS.douradoEnvelhecido}`,
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontFamily: tk.fontMono,
                      }}
                    >
                      asset: {tr.assetTag}
                    </span>
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={duracao}
        step={0.1}
        value={t}
        onChange={(e) => setT(Number(e.target.value))}
        style={{ width: larguraPx, alignSelf: "center" }}
      />
      <p style={{ textAlign: "center", fontFamily: tk.fontMono, fontSize: "0.7rem", color: tk.muted }}>
        {t.toFixed(1)}s / {duracao.toFixed(1)}s · {fmt.label}
      </p>
    </div>
  )
}
