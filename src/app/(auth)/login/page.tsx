"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { loginAction, type LoginState } from "./actions"
import { Button, Input, Label } from "@/components/ui/primitives"

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email ou senha incorretos.",
  Configuration: "Erro de configuração do servidor. Verifique AUTH_SECRET e NEXTAUTH_URL.",
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, undefined)
  const error = state?.error ?? (urlError ? ERROR_MESSAGES[urlError] ?? "Não foi possível entrar." : undefined)

  return (
    <div className="ce-surface ce-animate-in" style={{ padding: "var(--space-xl)" }}>
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <p className="ce-kicker" style={{ marginBottom: "var(--space-sm)" }}>Acesso</p>
        <h2
          className="font-display"
          style={{ fontSize: "var(--text-xl)", fontWeight: 800, lineHeight: 1.1 }}
        >
          Entrar
        </h2>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" name="email" required autoComplete="username" />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" name="password" required autoComplete="current-password" />
        </div>
        <div>
          <Label htmlFor="totp">Código MFA (se ativo)</Label>
          <Input id="totp" type="text" name="totp" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} />
        </div>
        {error && <p className="ce-error" role="alert">{error}</p>}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  )
}
