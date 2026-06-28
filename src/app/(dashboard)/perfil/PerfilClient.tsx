"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { apiUrl } from "@/lib/api-url"
import { PageHeader, Surface, SectionTitle, Input, Button } from "@/components/ui/primitives"

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
    const res = await fetch(apiUrl("/api/user/totp"))
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
      const res = await fetch(apiUrl("/api/user/totp"), {
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
    await fetch(apiUrl("/api/user/totp"), { method: "DELETE" })
    setEnabled(false)
    setSetup(null)
  }

  return (
    <div>
      <PageHeader kicker="Conta" title="Perfil" description={email} />

      <Surface style={{ maxWidth: 480 }}>
        <SectionTitle>Autenticação em dois fatores (TOTP)</SectionTitle>
        {enabled ? (
          <div>
            <p style={{ color: "var(--success)", fontSize: 14, marginBottom: 16 }}>MFA ativo</p>
            <button onClick={disable} style={{ padding: "9px 16px", background: "transparent", color: "var(--danger)", border: "1px solid rgba(248,113,113,0.4)", borderRadius: 8, cursor: "pointer" }}>Desativar MFA</button>
          </div>
        ) : setup ? (
          <form onSubmit={confirmEnable}>
            {qr && <img src={qr} alt="QR TOTP" style={{ width: 180, height: 180, marginBottom: 16, borderRadius: 8 }} />}
            <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 12 }}>Escaneie o QR no app autenticador e digite o código de 6 dígitos.</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="000000" className="ce-input" style={{ marginBottom: 12 }} />
            {error && <p className="ce-error" style={{ marginBottom: 8 }}>{error}</p>}
            <Button type="submit" disabled={busy}>Confirmar e ativar</Button>
          </form>
        ) : (
          <Button type="button" onClick={startSetup}>Ativar MFA</Button>
        )}
      </Surface>
    </div>
  )
}
