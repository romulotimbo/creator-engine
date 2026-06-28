"use client"

import { Suspense, useState } from "react"
import { BootSequence, useBootReady } from "@/components/auth/boot-sequence"

function AuthShellInner({ children }: { children: React.ReactNode }) {
  const { ready, markReady } = useBootReady()
  const [bootDone, setBootDone] = useState(false)

  const formReady = ready || bootDone

  return (
    <div className="ce-auth-shell">
      <aside className="ce-auth-terminal">
        <BootSequence onComplete={() => { setBootDone(true); markReady() }} />
        {bootDone && (
          <div style={{ position: "relative", marginTop: "var(--space-2xl)" }}>
            <h1
              className="font-display phosphor-glow"
              style={{
                fontSize: "var(--text-display)",
                fontWeight: 700,
                lineHeight: 0.95,
                color: "var(--accent)",
                maxWidth: "10ch",
              }}
            >
              Creator Engine
            </h1>
            <p
              style={{
                marginTop: "var(--space-md)",
                color: "var(--muted-foreground)",
                fontSize: "var(--text-sm)",
                maxWidth: "32ch",
                lineHeight: 1.6,
              }}
            >
              Central de comando para personas digitais — roteiros, calendário, funil e P&L.
            </p>
          </div>
        )}
      </aside>
      <div className="ce-auth-form-wrap">
        <div className="ce-auth-form-panel" data-ready={formReady}>
          {formReady ? children : null}
        </div>
      </div>
    </div>
  )
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthShellInner>{children}</AuthShellInner>
    </Suspense>
  )
}
