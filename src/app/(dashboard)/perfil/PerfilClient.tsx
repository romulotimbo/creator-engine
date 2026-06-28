"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

export default function PerfilClient({ email, totpEnabled: initialEnabled }: { email: string; totpEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (setup?.uri) {
      QRCode.toDataURL(setup.uri).then(setQr).catch(() => setQr(null))
    }
  }, [setup])

  async function startSetup() {
    setError(null)
    const res = await fetch("/api/user/totp")
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setSetup({ secret: data.secret, uri: data.uri })
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault()
    if (!setup) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/user/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setup.secret, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha")
      setEnabled(true)
      setSetup(null)
      setCode("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (!confirm("Desativar MFA?")) return
    await fetch("/api/user/totp", { method: "DELETE" })
    setEnabled(false)
    setSetup(null)
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Perfil</h1>
      <p style={{ color: "#7d899c", fontSize: 14, marginBottom: 32 }}>{email}</p>

      <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, maxWidth: 480 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Autenticação em dois fatores (TOTP)</h2>
        {enabled ? (
          <div>
            <p style={{ color: "#34d399", fontSize: 14, marginBottom: 16 }}>MFA ativo</p>
            <button onClick={disable} style={{ padding: "9px 16px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)", borderRadius: 8, cursor: "pointer" }}>Desativar MFA</button>
          </div>
        ) : setup ? (
          <form onSubmit={confirmEnable}>
            {qr && <img src={qr} alt="QR TOTP" style={{ width: 180, height: 180, marginBottom: 16, borderRadius: 8 }} />}
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>Escaneie o QR no app autenticador e digite o código de 6 dígitos.</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="000000" style={{ width: "100%", padding: "10px 12px", background: "#0a0a0f", border: "1px solid #2d2d3f", borderRadius: 8, color: "#e2e8f0", marginBottom: 12 }} />
            {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 8 }}>{error}</p>}
            <button type="submit" disabled={busy} style={{ padding: "9px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Confirmar e ativar</button>
          </form>
        ) : (
          <button onClick={startSetup} style={{ padding: "9px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Ativar MFA</button>
        )}
      </div>
    </div>
  )
}
