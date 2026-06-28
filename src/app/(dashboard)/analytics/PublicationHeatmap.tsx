import { Fragment } from "react"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function PublicationHeatmap({ grid, max }: { grid: number[][]; max: number }) {
  if (max === 0) {
    return (
      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 32, textAlign: "center", color: "#7d899c", marginTop: 24 }}>
        Sem posts publicados com data para gerar heatmap.
      </div>
    )
  }

  return (
    <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, marginTop: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Heatmap de publicação (dia × hora)</h2>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `48px repeat(24, 20px)`, gap: 2, alignItems: "center" }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ fontSize: 9, color: "#64748b", textAlign: "center" }}>{h}</div>
          ))}
          {grid.map((row, dow) => (
            <Fragment key={dow}>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{DIAS[dow]}</div>
              {row.map((count, h) => {
                const intensity = count / max
                return (
                  <div
                    key={`${dow}-${h}`}
                    title={`${DIAS[dow]} ${h}h: ${count} posts`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 3,
                      background: count === 0 ? "#1e1e2e" : `rgba(124, 58, 237, ${0.15 + intensity * 0.85})`,
                      border: "1px solid #2d2d3f",
                    }}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
