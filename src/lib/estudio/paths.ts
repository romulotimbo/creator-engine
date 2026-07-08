/**
 * Convenções de diretórios e naming da esteira de estilização.
 * Módulo puro (sem deps de Node) — compartilhado por API e worker.
 *
 * Layout do volume compartilhado (DATA_DIR, default /data/estudio):
 *   fontes/   → vídeo bruto ingerido (inbox)
 *   assets/   → assets de estilização (overlays, molduras, lockups)
 *   output/   → MP4 finais renderizados (pós strip de metadados)
 */
export const ESTUDIO_SUBDIRS = {
  fontes: "fontes",
  assets: "assets",
  output: "output",
} as const

export const VIDEO_EXTS = [".mp4", ".mov", ".webm", ".mkv", ".m4v"]

export function isVideoFile(name: string): boolean {
  const lower = name.toLowerCase()
  return VIDEO_EXTS.some((ext) => lower.endsWith(ext))
}

const FORMATO_SLUG: Record<string, string> = {
  VERTICAL_9_16: "9x16",
  QUADRADO_1_1: "1x1",
  RETRATO_4_5: "4x5",
}

/**
 * Nome do arquivo de saída: {template}_{formato}_{YYYYMMDD}[-vN].mp4
 * `versao` (>=2) adiciona o sufixo -vN.
 */
export function nomeOutput(
  templateSlug: string,
  formato: string,
  data: Date = new Date(),
  versao = 1
): string {
  const yyyymmdd = data.toISOString().slice(0, 10).replace(/-/g, "")
  const fmt = FORMATO_SLUG[formato] ?? formato.toLowerCase()
  const v = versao > 1 ? `-v${versao}` : ""
  return `${templateSlug}_${fmt}_${yyyymmdd}${v}.mp4`
}
