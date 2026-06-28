import { db } from "@/lib/db"
import PlanoAtaqueClient from "./PlanoAtaqueClient"

const DEFAULT_ITENS = [
  { fase: "Fase 0 — Setup", ordem: 1, titulo: "Banco de dev local", descricao: "docker-compose.dev.yml + schemas" },
  { fase: "Fase 0 — Setup", ordem: 2, titulo: "Variáveis de ambiente", descricao: "DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY" },
  { fase: "Fase 0 — Setup", ordem: 3, titulo: "Renomear PersonaForge → Creator Engine", descricao: "layout, sidebar, package.json" },
  { fase: "Fase 0 — Setup", ordem: 4, titulo: "Plano de ataque na app", descricao: "Página /plano-de-ataque operacional" },
  { fase: "Fase 1 — PersonaForge", ordem: 10, titulo: "Formulário persona com contas", descricao: "PF-01 — transação única" },
  { fase: "Fase 1 — PersonaForge", ordem: 11, titulo: "Modal CRUD de posts", descricao: "PF-04 — todos os campos" },
  { fase: "Fase 1 — PersonaForge", ordem: 12, titulo: "Importação XLSX roteiros", descricao: "519+ posts veesemfiltro" },
  { fase: "Fase 1 — PersonaForge", ordem: 13, titulo: "Calendário interativo", descricao: "PF-03 — drag-drop" },
  { fase: "Fase 1 — PersonaForge", ordem: 14, titulo: "Funil interativo", descricao: "PF-05 — CRUD + checklist" },
  { fase: "Fase 1 — PersonaForge", ordem: 15, titulo: "Discovery CRUD + kanban", descricao: "PF-08" },
  { fase: "Fase 1 — PersonaForge", ordem: 16, titulo: "Imagens IA + FluxoImagem", descricao: "PF-07" },
  { fase: "Fase 2 — Creator Engine", ordem: 20, titulo: "Ferramentas + assinaturas", descricao: "CE-01" },
  { fase: "Fase 2 — Creator Engine", ordem: 21, titulo: "Templates de conteúdo", descricao: "CE-02" },
  { fase: "Fase 2 — Creator Engine", ordem: 22, titulo: "SOPs com execução guiada", descricao: "CE-03" },
  { fase: "Fase 2 — Creator Engine", ordem: 23, titulo: "Prompts globais", descricao: "CE-04 — import dos roteiros" },
  { fase: "Fase 2 — Creator Engine", ordem: 24, titulo: "Analytics cross-persona", descricao: "CE-05 — heatmap + exports" },
  { fase: "Segurança", ordem: 30, titulo: "MFA/TOTP", descricao: "RNF-01 — login e reveal credenciais" },
  { fase: "Segurança", ordem: 31, titulo: "Rate limiting APIs", descricao: "100 req/min por IP" },
]

export default async function PlanoDeAtaquePage() {
  const count = await db.planoAtaqueItem.count()
  if (count === 0) {
    await db.planoAtaqueItem.createMany({ data: DEFAULT_ITENS })
  }

  const itens = await db.planoAtaqueItem.findMany({
    orderBy: [{ fase: "asc" }, { ordem: "asc" }],
  })

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Plano de Ataque</h1>
      <p style={{ color: "#7d899c", fontSize: 14, marginBottom: 32 }}>
        Checklist estratégico do Creator Engine — acompanhe o progresso de implementação e operação.
      </p>
      <PlanoAtaqueClient initial={itens} />
    </div>
  )
}
