import { db } from "@/lib/db"
import { validarTimeline, type ValidacaoResultado } from "./timeline"

/**
 * Valida um roteiro contra o estado real do banco: duração da fonte associada
 * e existência das tags de asset referenciadas.
 */
export async function validarRoteiroContraDb(
  timeline: unknown,
  opts: { fonteVideoId?: string | null } = {}
): Promise<ValidacaoResultado> {
  let duracaoFonteSeg: number | undefined
  if (opts.fonteVideoId) {
    const fonte = await db.fonteVideo.findUnique({
      where: { id: opts.fonteVideoId },
      select: { duracaoSeg: true },
    })
    if (!fonte) return { ok: false, erros: ["Fonte de vídeo não encontrada."] }
    duracaoFonteSeg = fonte.duracaoSeg > 0 ? fonte.duracaoSeg : undefined
  }

  const tagsDisponiveis = (await db.assetEstilizacao.findMany({ select: { tag: true } })).map((a) => a.tag)
  return validarTimeline(timeline, { duracaoFonteSeg, tagsDisponiveis })
}
