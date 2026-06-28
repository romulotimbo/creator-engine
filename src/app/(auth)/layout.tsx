import { Suspense } from "react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ce-auth-shell">
      <aside className="ce-auth-brand">
        <p className="ce-kicker" style={{ marginBottom: "var(--space-md)" }}>
          Operação solo
        </p>
        <h1
          className="font-display"
          style={{
            fontSize: "var(--text-display)",
            fontWeight: 800,
            lineHeight: 0.95,
            maxWidth: "8ch",
          }}
        >
          Creator Engine
        </h1>
        <p
          style={{
            marginTop: "var(--space-lg)",
            color: "var(--muted-foreground)",
            fontSize: "var(--text-sm)",
            maxWidth: "28ch",
            lineHeight: 1.6,
          }}
        >
          Central de comando para personas digitais — roteiros, calendário, funil e P&L num só lugar.
        </p>
      </aside>
      <div className="ce-auth-form-wrap">
        <div style={{ width: "100%", maxWidth: "22rem" }}>
          <Suspense>{children}</Suspense>
        </div>
      </div>
    </div>
  )
}
