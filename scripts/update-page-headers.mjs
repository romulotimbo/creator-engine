import fs from "fs"
import path from "path"

const pages = [
  ["src/app/(dashboard)/ferramentas/page.tsx", "Creator Engine", "Ferramentas", "Assinaturas, custos e documentação — reutilizável entre personas"],
  ["src/app/(dashboard)/templates/page.tsx", "Creator Engine", "Templates", "Playbooks reutilizáveis com variáveis — instancie para qualquer persona"],
  ["src/app/(dashboard)/sops/page.tsx", "Creator Engine", "SOPs", "Procedimentos operacionais com execução guiada e histórico"],
  ["src/app/(dashboard)/prompts/page.tsx", "Creator Engine", "Prompts Globais", "Biblioteca centralizada de prompts com validação RN-02"],
  ["src/app/(dashboard)/discovery/page.tsx", "PersonaForge", "Discovery", "Ideias, experimentos, tendências e aprendizados"],
  ["src/app/(dashboard)/financeiro/page.tsx", "PersonaForge", "Financeiro", "Receitas, custos e P&L global"],
  ["src/app/(dashboard)/calendario/page.tsx", "PersonaForge", "Calendário Global", "Visão unificada de publicações agendadas"],
  ["src/app/(dashboard)/plano-de-ataque/page.tsx", "Operação", "Plano de Ataque", "Checklist estratégico e prioridades da operação"],
]

for (const [file, kicker, title, desc] of pages) {
  const full = path.join(process.cwd(), file)
  let c = fs.readFileSync(full, "utf8")
  if (c.includes("PageHeader")) continue

  if (!c.includes('from "@/components/ui/primitives"')) {
    c = c.replace(/^import /m, 'import { PageHeader } from "@/components/ui/primitives"\nimport ')
  }

  c = c.replace(
    /<div style=\{\{ marginBottom: 24 \}\}>[\s\S]*?<\/div>\s*\n\s*(<[A-Z])/,
    `<PageHeader kicker="${kicker}" title="${title}" description="${desc}" />\n\n      $1`,
  )

  fs.writeFileSync(full, c)
  console.log("updated", file)
}

console.log("done")
