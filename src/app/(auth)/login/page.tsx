"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { loginAction, type LoginState } from "./actions"

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
    <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Creator Engine</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Acesse sua conta</p>
      </div>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            style={{
              width: "100%", padding: "10px 12px", background: "#1e1e2e",
              border: "1px solid #2d2d3f", borderRadius: 8, color: "#e2e8f0",
              fontSize: 14, outline: "none"
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Senha</label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            style={{
              width: "100%", padding: "10px 12px", background: "#1e1e2e",
              border: "1px solid #2d2d3f", borderRadius: 8, color: "#e2e8f0",
              fontSize: 14, outline: "none"
            }}
          />
        </div>
        {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "10px 0", background: "#7c3aed", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1
          }}
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  )
}
