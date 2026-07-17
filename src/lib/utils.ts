import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CSSProperties } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value))
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${Number(value).toFixed(1)}%`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function getProgressPercent(atual: number, meta: number): number {
  if (!meta || meta === 0) return 0
  return Math.min(100, Math.round((atual / meta) * 100))
}

export const PERSONA_STATUS_LABELS: Record<string, string> = {
  ATIVA: "Ativa",
  TESTE: "Em Teste",
  SHADOW_BAN: "Shadow Ban",
  SUSPENSA: "Suspensa",
  BANIDA: "Banida",
}

export const PERSONA_STATUS_COLORS: Record<string, string> = {
  ATIVA: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  TESTE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SHADOW_BAN: "bg-red-500/20 text-red-400 border-red-500/30",
  SUSPENSA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BANIDA: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

/** Cores inline (CSS vars) para badges de status */
export const PERSONA_STATUS_VAR: Record<string, string> = {
  ATIVA: "var(--success)",
  TESTE: "var(--cyan)",
  SHADOW_BAN: "var(--danger)",
  SUSPENSA: "var(--warning)",
  BANIDA: "var(--faint)",
}

export function personaStatusBadgeStyle(status: string): CSSProperties {
  const color = PERSONA_STATUS_VAR[status] ?? "var(--muted-foreground)"
  return {
    padding: "0.15rem 0.55rem",
    borderRadius: "var(--radius)",
    fontSize: "0.65rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color,
    background: `color-mix(in oklch, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
    fontFamily: "var(--font-mono), monospace",
  }
}

export const POST_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  AGENDADO: "Agendado",
  PUBLICADO: "Publicado",
  REJEITADO: "Rejeitado",
}

export const POST_STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-gray-500/20 text-gray-400",
  APROVADO: "bg-blue-500/20 text-blue-400",
  AGENDADO: "bg-purple-500/20 text-purple-400",
  PUBLICADO: "bg-emerald-500/20 text-emerald-400",
  REJEITADO: "bg-red-500/20 text-red-400",
}

export const PLATAFORMA_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  FANVUE: "FanVue",
  FACEBOOK: "Facebook",
}

export const PILAR_LABELS: Record<string, string> = {
  IDENTIDADE: "Identidade e Atitude",
  LIFESTYLE: "Lifestyle Aspiracional",
  SENSUALIDADE: "Sensualidade Inteligente",
  BASTIDORES: "Bastidores e Autenticidade",
}

export const TIPO_POST_LABELS: Record<string, string> = {
  IMAGEM: "Imagem",
  REEL: "Reel",
  STORY: "Story",
  ENSAIO: "Ensaio",
  CARROSSEL: "Carrossel",
}

export const CATEGORIA_FERRAMENTA_LABELS: Record<string, string> = {
  // Geração de conteúdo
  GERACAO_IMAGEM: "Geração de Imagem",
  VIDEO: "Geração/Edição de Vídeo",
  VOZ: "Voz / Áudio",
  LLM_IA: "IA / LLM (modelos)",
  DESIGN: "Design / Edição",
  // Operação e anti-ban
  ANTI_DETECCAO: "Anti-detecção",
  PROXY: "Proxy / Rede",
  PLATAFORMA: "Plataforma / Rede Social",
  // Backoffice e infraestrutura
  AUTOMACAO: "Automação / Workflows",
  COMUNICACAO: "E-mail / Comunicação",
  ARMAZENAMENTO: "Armazenamento / Nuvem",
  ANALYTICS: "Analytics / Métricas",
  PAGAMENTO: "Pagamento / Financeiro",
  INFRAESTRUTURA: "Infraestrutura / Dev",
  PRODUTIVIDADE: "Produtividade",
  OUTRO: "Outro",
}

// Exemplos de ferramentas por categoria — usados como dica na UI para facilitar a classificação.
export const CATEGORIA_FERRAMENTA_HINTS: Record<string, string> = {
  GERACAO_IMAGEM: "Ex.: Magnific, Midjourney, Stable Diffusion, ComfyUI",
  VIDEO: "Ex.: Runway, Kling, HeyGen, CapCut, Remotion",
  VOZ: "Ex.: ElevenLabs, PlayHT, Suno",
  LLM_IA: "Ex.: OpenRouter, OpenAI, Anthropic, Gemini",
  DESIGN: "Ex.: Canva, Figma, Photoshop",
  ANTI_DETECCAO: "Ex.: Dolphin Anty, GoLogin, Multilogin",
  PROXY: "Ex.: IPRoyal, Bright Data, Smartproxy",
  PLATAFORMA: "Ex.: Instagram, TikTok, YouTube, FanVue",
  AUTOMACAO: "Ex.: n8n, Make, Zapier",
  COMUNICACAO: "Ex.: Gmail, Outlook, Slack, Telegram",
  ARMAZENAMENTO: "Ex.: Google Drive, Dropbox, S3",
  ANALYTICS: "Ex.: Google Analytics, Metricool",
  PAGAMENTO: "Ex.: Braip, Hotmart, Stripe, Wise",
  INFRAESTRUTURA: "Ex.: VPS, Docker, GitHub, Traefik",
  PRODUTIVIDADE: "Ex.: Notion, Obsidian, Trello",
  OUTRO: "Não se encaixa nas demais categorias",
}

// Fonte única dos valores válidos (ordem preservada) — reusada nos schemas Zod das rotas.
export const CATEGORIA_FERRAMENTA_VALUES = Object.keys(
  CATEGORIA_FERRAMENTA_LABELS,
) as [string, ...string[]]

export const STATUS_ASSINATURA_LABELS: Record<string, string> = {
  ATIVA: "Ativa",
  PAUSADA: "Pausada",
  TRIAL: "Trial",
  CANCELADA: "Cancelada",
}

export const STATUS_ASSINATURA_COLORS: Record<string, string> = {
  ATIVA: "var(--success)",
  PAUSADA: "var(--warning)",
  TRIAL: "var(--cyan)",
  CANCELADA: "var(--faint)",
}

export const CATEGORIA_PROMPT_LABELS: Record<string, string> = {
  PERSONAGEM: "Personagem",
  CENARIO: "Cenário",
  PRODUTO: "Produto",
  VIDEO: "Vídeo",
  UPSCALE: "Upscale",
}

// RN-02: prompts de IA não devem conter descrições físicas da persona.
// Lista negra de termos de aparência (pt + alguns en) usada como alerta.
export const PROMPT_BLACKLIST = [
  "cabelo", "loira", "loiro", "morena", "moreno", "ruiva", "ruivo",
  "tatuagem", "tatuada", "tatuado", "olhos", "pele", "seios", "corpo",
  "magra", "magro", "gorda", "gordo", "alta", "baixa", "branca", "negra",
]

export function checkPromptBlacklist(text: string | null | undefined): string[] {
  const t = (text || "").toLowerCase()
  return PROMPT_BLACKLIST.filter((w) => t.includes(w))
}

export const CATEGORIA_TEMPLATE_LABELS: Record<string, string> = {
  ROTEIRO: "Roteiro",
  COPY: "Copy",
  HOOK: "Hook",
  ESTRATEGIA: "Estratégia",
  CALENDARIO: "Calendário",
}

// Extrai variáveis {{nome}} de um texto de template
export function extractTemplateVars(text: string | null | undefined): string[] {
  const matches = (text || "").match(/\{\{\s*([\w-]+)\s*\}\}/g) || []
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "").trim()))]
}

// Substitui {{var}} pelos valores fornecidos
export function renderTemplate(text: string, values: Record<string, string>): string {
  return (text || "").replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, k) => values[k] ?? `{{${k}}}`)
}

export const CATEGORIA_SOP_LABELS: Record<string, string> = {
  ONBOARDING: "Onboarding de Persona",
  ANTI_BAN: "Anti-Ban",
  ESCALADA: "Escalada de Plataforma",
  PRODUCAO: "Produção de Conteúdo",
  GERACAO_IMAGEM: "Geração de Imagem",
  MONETIZACAO: "Monetização",
}

export const STATUS_SOP_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ATIVO: "Ativo",
  DEPRECIADO: "Depreciado",
}

export const STATUS_SOP_COLORS: Record<string, string> = {
  RASCUNHO: "var(--warning)",
  ATIVO: "var(--success)",
  DEPRECIADO: "var(--faint)",
}
