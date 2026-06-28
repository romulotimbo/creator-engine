import { Fragment } from "react"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function PublicationHeatmap({ grid, max }: { grid: number[][]; max: number }) {
  if (max === 0) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 32, textAlign: "center", color: "var(--faint)", marginTop: 24 }}>
        Sem posts publicados com data para gerar heatmap.
      </div>
    )
  }

  return (
    <div className="ce-surface ce-animate-in" style={{ padding: "var(--space-xl)", marginTop: "var(--space-xl)" }}>
      <h2 className="ce-section-title">Heatmap de publicação (dia × hora)</h2>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `48px repeat(24, 20px)`, gap: 2, alignItems: "center" }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ fontSize: 9, color: "var(--faint)", textAlign: "center" }}>{h}</div>
          ))}
          {grid.map((row, dow) => (
            <Fragment key={dow}>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{DIAS[dow]}</div>
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
                      background: count === 0
                        ? "var(--border)"
                        : `color-mix(in oklch, var(--accent) ${Math.round(15 + intensity * 85)}%, var(--surface))`,
                      border: "1px solid var(--border-strong)",
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
