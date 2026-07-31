"use client"

import { useState } from "react"
import { Button } from "@/components/ui/primitives"
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react"

export function ModalImportarCsv({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState("")
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ total: number; inseridos: number; atualizados: number } | null>(null)

  async function handleImport() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let res: Response
      if (activeTab === "file" && file) {
        const formData = new FormData()
        formData.append("file", file)
        res = await fetch("/api/afiliados/radar/importar-csv", {
          method: "POST",
          body: formData,
        })
      } else if (csvText.trim()) {
        res = await fetch("/api/afiliados/radar/importar-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText }),
        })
      } else {
        setError("Selecione um arquivo CSV ou cole o conteúdo.")
        setLoading(false)
        return
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Falha ao importar CSV")
      }

      setResult(data)
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err: unknown) {
      setError((err as Error).message || "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          width: "100%",
          maxWidth: 550,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={20} />
            Importar Ofertas via CSV
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20 }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: "var(--space-md)" }}>
          Envie o arquivo <code>produtos.csv</code> de plataformas como BuyGoods/ClickBank/Mediascalers. O sistema fará a sanitização automática e Upsert pelo nome da oferta.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-md)" }}>
          <Button
            type="button"
            variant={activeTab === "file" ? "primary" : "ghost"}
            onClick={() => setActiveTab("file")}
            style={{ fontSize: 13 }}
          >
            Upload de Arquivo
          </Button>
          <Button
            type="button"
            variant={activeTab === "paste" ? "primary" : "ghost"}
            onClick={() => setActiveTab("paste")}
            style={{ fontSize: 13 }}
          >
            Colar Texto CSV
          </Button>
        </div>

        {activeTab === "file" ? (
          <div
            style={{
              border: "2px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-lg)",
              textAlign: "center",
              marginBottom: "var(--space-md)",
              cursor: "pointer",
            }}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" style={{ cursor: "pointer", display: "block" }}>
              <FileText size={32} style={{ color: "var(--muted)", marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {file ? file.name : "Clique para selecionar o produtos.csv"}
              </p>
              {file && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--faint)" }}>{(file.size / 1024).toFixed(1)} KB</p>}
            </label>
          </div>
        ) : (
          <div style={{ marginBottom: "var(--space-md)" }}>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Cole as linhas do CSV aqui (delimitadas por vírgula ou ponto-e-vírgula)..."
              style={{
                width: "100%",
                padding: 10,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-subtle)",
                color: "var(--foreground)",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            />
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              marginBottom: "var(--space-md)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid var(--success)",
              color: "var(--success)",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              marginBottom: "var(--space-md)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              Sucesso! Total: {result.total} (Novos: {result.inseridos}, Atualizados: {result.atualizados})
            </span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading || (activeTab === "file" && !file) || (activeTab === "paste" && !csvText.trim())}>
            {loading ? "Processando..." : "Importar Agora"}
          </Button>
        </div>
      </div>
    </div>
  )
}
