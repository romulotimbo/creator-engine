"use client"

import { useState } from "react"

type PaletteTokens = {
  id: string
  name: string
  tagline: string
  bg: string
  fg: string
  surface: string
  surfaceRaised: string
  border: string
  accent: string
  accentFg: string
  kicker: string
  success: string
  danger: string
}

const PALETTES: PaletteTokens[] = [
  {
    id: "tinta-acido",
    name: "1 · Tinta & Ácido",
    tagline: "Estúdio tattoo · verde fluorescente",
    bg: "oklch(0.13 0.02 260)",
    fg: "oklch(0.93 0.02 95)",
    surface: "oklch(0.16 0.022 260)",
    surfaceRaised: "oklch(0.19 0.025 260)",
    border: "oklch(0.28 0.03 260)",
    accent: "oklch(0.82 0.22 130)",
    accentFg: "oklch(0.15 0.03 130)",
    kicker: "oklch(0.75 0.06 260)",
    success: "oklch(0.65 0.12 140)",
    danger: "oklch(0.55 0.18 25)",
  },
  {
    id: "risograph",
    name: "2 · Risograph",
    tagline: "Zine xerocado · magenta riso",
    bg: "oklch(0.12 0.008 30)",
    fg: "oklch(0.92 0.03 85)",
    surface: "oklch(0.15 0.01 30)",
    surfaceRaised: "oklch(0.18 0.012 35)",
    border: "oklch(0.25 0.015 40)",
    accent: "oklch(0.58 0.28 350)",
    accentFg: "oklch(0.98 0.01 85)",
    kicker: "oklch(0.70 0.14 55)",
    success: "oklch(0.62 0.12 145)",
    danger: "oklch(0.52 0.22 20)",
  },
  {
    id: "mercury",
    name: "3 · Mercury Night",
    tagline: "Backstage · rosa queimado + prata",
    bg: "oklch(0.14 0.018 285)",
    fg: "oklch(0.94 0.012 285)",
    surface: "oklch(0.17 0.02 285)",
    surfaceRaised: "oklch(0.20 0.022 285)",
    border: "oklch(0.27 0.025 285)",
    accent: "oklch(0.65 0.20 350)",
    accentFg: "oklch(0.98 0.01 285)",
    kicker: "oklch(0.72 0.04 285)",
    success: "oklch(0.68 0.14 160)",
    danger: "oklch(0.56 0.20 25)",
  },
  {
    id: "ops",
    name: "4 · Ops Military",
    tagline: "Centro de comando · oliva + siena",
    bg: "oklch(0.15 0.02 130)",
    fg: "oklch(0.91 0.025 95)",
    surface: "oklch(0.18 0.025 130)",
    surfaceRaised: "oklch(0.21 0.028 128)",
    border: "oklch(0.28 0.03 125)",
    accent: "oklch(0.62 0.14 45)",
    accentFg: "oklch(0.98 0.01 95)",
    kicker: "oklch(0.78 0.10 95)",
    success: "oklch(0.60 0.10 130)",
    danger: "oklch(0.50 0.16 30)",
  },
  {
    id: "coral-atual",
    name: "Atual · Coral",
    tagline: "Implementação atual (referência)",
    bg: "oklch(0.14 0.012 55)",
    fg: "oklch(0.94 0.018 85)",
    surface: "oklch(0.17 0.014 52)",
    surfaceRaised: "oklch(0.20 0.016 50)",
    border: "oklch(0.26 0.018 52)",
    accent: "oklch(0.62 0.22 22)",
    accentFg: "oklch(0.98 0.01 85)",
    kicker: "oklch(0.78 0.12 85)",
    success: "oklch(0.72 0.14 155)",
    danger: "oklch(0.58 0.22 25)",
  },
]

function MiniPreview({ p, selected }: { p: PaletteTokens; selected: boolean }) {
  const display = "var(--font-display), system-ui, sans-serif"
  const body = "var(--font-body), system-ui, sans-serif"

  return (
    <div
      style={{
        background: p.bg,
        color: p.fg,
        border: selected ? `2px solid ${p.accent}` : `1px solid ${p.border}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        minHeight: 220,
        display: "flex",
      }}
    >
      <div style={{ width: 76, background: p.surface, borderRight: `1px solid ${p.border}`, padding: "12px 8px", flexShrink: 0 }}>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 11, color: p.accent, marginBottom: 12 }}>CE</div>
        {["DB", "PE", "CA"].map((code, i) => (
          <div
            key={code}
            style={{
              fontSize: 10,
              padding: "5px 6px",
              marginBottom: 2,
              borderLeft: i === 0 ? `2px solid ${p.accent}` : "2px solid transparent",
              background: i === 0 ? p.surfaceRaised : "transparent",
              color: i === 0 ? p.fg : p.kicker,
              fontWeight: i === 0 ? 600 : 400,
              fontFamily: body,
            }}
          >
            {code}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 12, fontFamily: body, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: p.kicker, fontWeight: 700 }}>Visão geral</div>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em" }}>Dashboard</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: "var(--radius)", padding: 10 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: p.kicker, marginBottom: 6 }}>Personas</div>
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 22, color: p.accent, lineHeight: 1 }}>3</div>
          </div>
          <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: "var(--radius)", padding: 10 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: p.kicker, marginBottom: 6 }}>Lucro</div>
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: p.success, lineHeight: 1 }}>+2,4k</div>
          </div>
        </div>
        <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: "var(--radius)", padding: 10, marginTop: "auto" }}>
          <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: p.kicker, marginBottom: 8 }}>Login</div>
          <div style={{ height: 8, background: p.bg, border: `1px solid ${p.border}`, borderRadius: "var(--radius)", marginBottom: 6 }} />
          <div style={{ height: 8, background: p.bg, border: `1px solid ${p.border}`, borderRadius: "var(--radius)", marginBottom: 8 }} />
          <div style={{ textAlign: "center", padding: "6px 0", background: p.accent, color: p.accentFg, fontFamily: display, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: "var(--radius)" }}>
            Entrar
          </div>
        </div>
      </div>
    </div>
  )
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 32, height: 18, background: color, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{label}</span>
    </div>
  )
}

export default function PaletasPage() {
  const [selected, setSelected] = useState("tinta-acido")

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", padding: "var(--space-2xl) var(--space-xl)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p className="ce-kicker" style={{ marginBottom: "var(--space-sm)" }}>Design · Impeccable</p>
        <h1 className="font-display" style={{ fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: "var(--space-sm)" }}>
          Escolha a paleta
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "var(--text-sm)", marginBottom: "var(--space-2xl)", maxWidth: "50ch" }}>
          Compare as opções abaixo e me diga o número (1–4) no chat.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-xl)" }}>
          {PALETTES.map(p => {
            const isSelected = selected === p.id
            return (
              <div key={p.id} className="ce-surface" style={{ padding: "var(--space-lg)" }}>
                <div style={{ marginBottom: "var(--space-md)" }}>
                  <h2 className="font-display" style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>{p.name}</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "var(--text-sm)", marginTop: 4 }}>{p.tagline}</p>
                </div>
                <MiniPreview p={p} selected={isSelected} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "var(--space-md) 0" }}>
                  <Swatch label="Fundo" color={p.bg} />
                  <Swatch label="Acento" color={p.accent} />
                  <Swatch label="Kicker" color={p.kicker} />
                </div>
                <button
                  type="button"
                  className={`ce-btn ${isSelected ? "ce-btn-primary" : "ce-btn-ghost"}`}
                  style={{ width: "100%" }}
                  onClick={() => setSelected(p.id)}
                >
                  {isSelected ? "Selecionada" : "Escolher esta"}
                </button>
              </div>
            )
          })}
        </div>

        <p style={{ marginTop: "var(--space-2xl)", color: "var(--muted-foreground)", fontSize: "var(--text-sm)" }}>
          Escolha atual: <strong style={{ color: "var(--foreground)" }}>{PALETTES.find(p => p.id === selected)?.name}</strong>
        </p>
      </div>
    </div>
  )
}
