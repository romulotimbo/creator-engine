"use client"

import { useMemo, useState } from "react"
import { Oswald, Spectral } from "next/font/google"
import { COLORS, OURO_MATERIAL, type FormatoId, FORMATOS } from "../../../../brand/tokens"
import type { Timeline } from "@/lib/estudio/timeline"
import { tk } from "@/lib/tokens"

// Mesmas fontes do render Remotion (Tactical Rebel) para paridade visual.
const oswald = Oswald({ subsets: ["latin"], weight: ["600", "700"] })
const spectral = Spectral({ subsets: ["latin"], weight: ["600"], style: ["italic"] })

/** Realce inline: *palavra* → cor de destaque (paridade com o render). */
function realce(texto: string, cor: string) {
  const re = /\*([^*]+)\*/g
  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    if (m.index > last) out.push(texto.slice(last, m.index))
    out.push(<span key={m.index} style={{ color: cor }}>{m[1]}</span>)
    last = m.index + m[0].length
  }
  if (last < texto.length) out.push(texto.slice(last))
  return out.length ? out : texto
}

const placaStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.62)",
  padding: "4px 10px",
  borderRadius: 4,
}

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
  const handle = (timeline as { handle?: string }).handle
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
        {/* scrim de cena (protege topo e base) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 24%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.06) 60%, rgba(0,0,0,0.72) 100%)",
          }}
        />
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
                    tr.estilo === "cta" ? (
                      <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <span aria-hidden style={{ height: 2, width: 60, background: OURO_MATERIAL, borderRadius: 999 }} />
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            className={oswald.className}
                            style={{ color: COLORS.brancoGelo, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.24em", fontSize: 13 }}
                          >
                            {realce(tr.conteudo ?? "", COLORS.douradoEnvelhecido)}
                          </span>
                          <span style={{ color: COLORS.douradoEnvelhecido, fontSize: 15 }}>→</span>
                        </span>
                        {handle && (
                          <span className={spectral.className} style={{ color: COLORS.douradoLuz, fontStyle: "italic", fontSize: 11 }}>@{handle}</span>
                        )}
                      </span>
                    ) : tr.estilo === "conviccao" ? (
                      <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <span
                          className={spectral.className}
                          style={{
                            textAlign: "center",
                            color: COLORS.douradoEnvelhecido,
                            fontStyle: "italic",
                            fontSize: 16,
                            lineHeight: 1.15,
                            textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                            padding: "0 6px",
                            ...(tr.placa ? placaStyle : {}),
                          }}
                        >
                          {realce(tr.conteudo ?? "", COLORS.brancoPuro)}
                        </span>
                        <span
                          aria-hidden
                          style={{
                            height: 2,
                            width: 44,
                            background: OURO_MATERIAL,
                            borderRadius: 999,
                            boxShadow: `0 0 8px ${COLORS.douradoEnvelhecido}55`,
                          }}
                        />
                      </span>
                    ) : (
                      <span
                        key={i}
                        className={oswald.className}
                        style={{
                          textAlign: "center",
                          color: COLORS.brancoGelo,
                          textTransform: "uppercase",
                          fontWeight: 700,
                          letterSpacing: "0.045em",
                          fontSize: 24,
                          lineHeight: 0.98,
                          textShadow: "0 2px 3px rgba(0,0,0,0.85), 0 6px 18px rgba(0,0,0,0.5)",
                          padding: "0 6px",
                          ...(tr.placa ? placaStyle : {}),
                        }}
                      >
                        {realce(tr.conteudo ?? "", COLORS.douradoEnvelhecido)}
                      </span>
                    )
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
        {handle && (
          <div
            aria-hidden
            className={oswald.className}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 6,
              textAlign: "center",
              opacity: 0.5,
              color: COLORS.brancoGelo,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            @{handle}
          </div>
        )}
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
