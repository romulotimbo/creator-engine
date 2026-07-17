import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Surface, PageHeader } from "@/components/ui/primitives"

export default async function AcessoNegadoPage() {
  const session = await auth()
  if (session) redirect("/")

  return (
    <div style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <PageHeader
        kicker="Acesso"
        title="Não autenticado"
        description="Em produção, o Authelia redireciona para login antes de chegar aqui."
      />
      <Surface>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Em desenvolvimento local, defina <code>AUTH_DEV_EMAIL</code> no ambiente (ex.:{" "}
          <code>admin@creator-engine.local</code>) e reinicie o servidor.
        </p>
      </Surface>
    </div>
  )
}
