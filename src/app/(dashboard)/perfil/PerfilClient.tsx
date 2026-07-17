"use client"

import { PageHeader, Surface, SectionTitle } from "@/components/ui/primitives"

export default function PerfilClient({
  email,
  name,
  logoutUrl,
}: {
  email: string
  name: string | null
  logoutUrl: string | null
}) {
  return (
    <div>
      <PageHeader
        kicker="Conta"
        title="Perfil"
        description={name ? `${name} · ${email}` : email}
      />

      <Surface style={{ maxWidth: 480 }}>
        <SectionTitle>Autenticação</SectionTitle>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Login e MFA são gerenciados pelo <strong>Authelia</strong> na borda (Traefik). Esta
          aplicação confia nos headers <code>Remote-Email</code> / <code>Remote-User</code> após
          o forward auth.
        </p>
        {logoutUrl && (
          <div style={{ marginTop: "var(--space-md)" }}>
            <a
              href={logoutUrl}
              style={{
                display: "inline-flex",
                padding: "9px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Sair (Authelia)
            </a>
          </div>
        )}
      </Surface>
    </div>
  )
}
