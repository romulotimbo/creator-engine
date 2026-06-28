import type { CSSProperties } from "react"

/** Estilos inline compartilhados — tokens synthwave CRT */
export const ui = {
  input: {
    width: "100%",
    padding: "0.65rem 0.85rem",
    background: "var(--background)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius)",
    color: "var(--foreground)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-mono), monospace",
    outline: "none",
  } satisfies CSSProperties,

  label: {
    display: "block",
    color: "var(--muted-foreground)",
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "var(--space-sm)",
    fontFamily: "var(--font-mono), monospace",
  } satisfies CSSProperties,

  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-lg)",
  } satisfies CSSProperties,

  cardTitle: {
    fontSize: "var(--text-base)",
    fontWeight: 600,
    color: "var(--foreground)",
    marginBottom: "var(--space-md)",
    fontFamily: "var(--font-display), system-ui, sans-serif",
  } satisfies CSSProperties,

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "oklch(0.05 0.04 285 / 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-md)",
    zIndex: 50,
  } satisfies CSSProperties,

  modal: {
    width: "100%",
    maxWidth: "42rem",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-xl)",
    maxHeight: "90vh",
    overflowY: "auto",
  } satisfies CSSProperties,

  empty: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-2xl)",
    textAlign: "center",
    color: "var(--faint)",
  } satisfies CSSProperties,

  progressTrack: {
    background: "var(--border-strong)",
    borderRadius: "var(--radius)",
    height: 5,
    overflow: "hidden",
  } satisfies CSSProperties,

  progressFill: (pct: number, complete?: boolean): CSSProperties => ({
    background: complete || pct >= 100 ? "var(--success)" : "var(--accent)",
    height: "100%",
    width: `${Math.min(100, Math.max(0, pct))}%`,
    transition: "width 0.3s var(--ease-out-quart)",
  }),

  muted: { color: "var(--muted-foreground)" } satisfies CSSProperties,
  faint: { color: "var(--faint)" } satisfies CSSProperties,
  fg: { color: "var(--foreground)" } satisfies CSSProperties,
  accent: { color: "var(--accent)" } satisfies CSSProperties,
  cyan: { color: "var(--cyan)" } satisfies CSSProperties,
} as const
