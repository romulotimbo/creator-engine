"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await signIn("credentials", { email, password, redirect: false })
    if (res?.error) {
      setError("Email ou senha incorretos")
      setLoading(false)
    } else {
      router.push("/")
    }
  }

  return (
    <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Creator Engine</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Acesse sua conta</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
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
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
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
          disabled={loading}
          style={{
            padding: "10px 0", background: "#7c3aed", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  )
}
