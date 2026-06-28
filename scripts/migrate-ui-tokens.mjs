import fs from "fs"
import path from "path"

const ROOT = path.join(process.cwd(), "src")

const REPLACEMENTS = [
  ["#0a0a0f", "var(--background)"],
  ["#111118", "var(--surface)"],
  ["#1e1e2e", "var(--border)"],
  ["#2d2d3f", "var(--border-strong)"],
  ["#7c3aed", "var(--accent)"],
  ["#4a0e8f", "var(--accent-hover)"],
  ["#e2e8f0", "var(--foreground)"],
  ["#94a3b8", "var(--muted-foreground)"],
  ["#64748b", "var(--faint)"],
  ["#7d899c", "var(--faint)"],
  ["#f87171", "var(--danger)"],
  ["#34d399", "var(--success)"],
  ["#fbbf24", "var(--warning)"],
  ["#f59e0b", "var(--warning)"],
  ["#60a5fa", "var(--cyan)"],
  ["#22d3ee", "var(--cyan)"],
  ["#f472b6", "oklch(0.68 0.2 350)"],
  ["rgba(124,58,237,0.3)", "color-mix(in oklch, var(--accent) 30%, transparent)"],
  ["rgba(248,113,113,0.3)", "color-mix(in oklch, var(--danger) 30%, transparent)"],
  ["#ffffff08", "color-mix(in oklch, var(--foreground) 3%, transparent)"],
  ["#0e2a1e", "color-mix(in oklch, var(--success) 12%, var(--background))"],
  ["#06281c", "var(--background)"],
  ['color: "#fff"', 'color: "var(--accent-foreground)"'],
  ['color: "#ffffff"', 'color: "var(--accent-foreground)"'],
  ["#a78bfa", "var(--accent)"],
  ["#ef4444", "var(--danger)"],
  ["#fca5a5", "var(--danger)"],
  ["#475569", "var(--faint)"],
  ["#3a2a00", "var(--background)"],
  ["#2a0a0a", "var(--background)"],
  ["#a5f3fc", "var(--cyan)"],
  ["#0c0c12", "var(--background)"],
  ["#2a1b4d", "color-mix(in oklch, var(--accent) 12%, var(--surface))"],
  ["rgba(124,58,237,0.4)", "color-mix(in oklch, var(--accent) 40%, transparent)"],
  ["rgba(239,68,68,0.1)", "color-mix(in oklch, var(--danger) 10%, transparent)"],
  ["rgba(239,68,68,0.3)", "color-mix(in oklch, var(--danger) 30%, transparent)"],
  ['var(--accent)20', 'color-mix(in oklch, var(--accent) 12%, transparent)'],
]

const FIX_QUOTED = [
  ["color: var(--accent-foreground)", 'color: "var(--accent-foreground)"'],
]

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full)
    else if (/\.(tsx|ts|css)$/.test(name)) {
      let content = fs.readFileSync(full, "utf8")
      let changed = false
      for (const [from, to] of REPLACEMENTS) {
        if (content.includes(from)) {
          content = content.split(from).join(to)
          changed = true
        }
      }
      for (const [from, to] of FIX_QUOTED) {
        if (content.includes(from)) {
          content = content.split(from).join(to)
          changed = true
        }
      }
      if (changed) {
        fs.writeFileSync(full, content)
        console.log("updated:", path.relative(process.cwd(), full))
      }
    }
  }
}

walk(ROOT)
console.log("done")
