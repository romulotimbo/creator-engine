#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const files = [
  "src/app/(dashboard)/financeiro/FinanceiroActions.tsx",
  "src/app/(dashboard)/sops/SopsClient.tsx",
  "src/app/(dashboard)/personas/[slug]/roteiros/RoteirosClient.tsx",
  "src/app/(dashboard)/plano-de-ataque/PlanoAtaqueClient.tsx",
  "src/app/(dashboard)/personas/[slug]/calendario/CalendarioClient.tsx",
  "src/app/(dashboard)/templates/TemplatesClient.tsx",
  "src/app/(dashboard)/perfil/PerfilClient.tsx",
  "src/app/(dashboard)/personas/[slug]/plano/PlanoClient.tsx",
  "src/app/(dashboard)/ferramentas/FerramentasClient.tsx",
  "src/app/(dashboard)/personas/[slug]/imagens/ImagensClient.tsx",
  "src/app/(dashboard)/calendario/CalendarioGlobalClient.tsx",
  "src/app/(dashboard)/personas/[slug]/funil/FunilClient.tsx",
  "src/app/(dashboard)/personas/[slug]/metricas/MetricasClient.tsx",
  "src/app/(dashboard)/discovery/DiscoveryClient.tsx",
  "src/app/(dashboard)/prompts/PromptsClient.tsx",
  "src/app/(dashboard)/personas/nova/page.tsx",
]

const imp = 'import { apiUrl } from "@/lib/api-url"\n'

function addImport(s) {
  if (s.includes('from "@/lib/api-url"')) return s
  if (s.startsWith('"use client"')) {
    return s.replace(/^("use client"\n\n?)/, `$1${imp}`)
  }
  const m = s.match(/^import .+\n/m)
  if (m) return s.replace(m[0], m[0] + imp)
  return imp + s
}

function wrapApiPaths(s) {
  // const url = isEdit ? `/api/...` : "/api/..."
  s = s.replace(
    /const url = ([^\n]+)/g,
    (_, expr) => {
      if (!expr.includes("/api/") || expr.includes("apiUrl")) return `const url = ${expr}`
      const wrapped = expr.replace(/(`\/api\/[^`]+`|"\/api\/[^"]+")/g, "apiUrl($1)")
      return `const url = ${wrapped}`
    },
  )
  // fetch(editing ? `/api/x` : "/api/y", ...)
  s = s.replace(
    /fetch\(\s*(\w+\s*\?\s*)(`\/api\/[^`]+`|"\/api\/[^"]+")(\s*:\s*)(`\/api\/[^`]+`|"\/api\/[^"]+")/g,
    "fetch($1apiUrl($2)$3apiUrl($4)",
  )
  // multiline fetch( \n isEdit ? ...
  s = s.replace(
    /fetch\(\s*\n\s*(\w+\s*\?\s*)(`\/api\/[^`]+`|"\/api\/[^"]+")(\s*:\s*)(`\/api\/[^`]+`|"\/api\/[^"]+")/g,
    "fetch($1apiUrl($2)$3apiUrl($4)",
  )
  // fetch(`/api/...` or fetch("/api/...
  s = s.replace(
    /fetch\(\s*(`\/api\/[^`]+`|"\/api\/[^"]+")/g,
    "fetch(apiUrl($1)",
  )
  return s
}

for (const rel of files) {
  const f = path.join(root, rel)
  if (!fs.existsSync(f)) {
    console.log("missing", rel)
    continue
  }
  let s = fs.readFileSync(f, "utf8")
  if (!s.includes("/api/")) continue
  const before = s
  s = wrapApiPaths(s)
  s = addImport(s)
  if (s !== before) {
    fs.writeFileSync(f, s)
    console.log("updated", rel)
  } else {
    console.log("unchanged", rel)
  }
}
