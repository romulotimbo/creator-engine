import type { PrismaClient } from "@prisma/client"
import { decimalNum } from "@/lib/afiliados"
import { criarItemFilaComDedup } from "@/lib/afiliados/fila"
import { getLimiar } from "@/lib/afiliados/limiares"

/**
 * Gatilho de entrada em escala (ticket 09 —
 * .scratch/afiliados-ciclo-oportunidade-escala/issues/09-gatilho-entrada-escala.md).
 *
 * Condição dupla, não single-metric: volume mínimo de vendas `APROVADA` **e**
 * ROI acumulado com folga real sobre o breakeven (não empate — diferente da
 * pré-condição de re-teste, que aceita ±10%). `cpaReal < cpaAlvoBreakeven`
 * isolado NÃO é gate — fica subsumido no corte de ROI.
 *
 * Nunca automático — sempre `ItemFila`; `Campanha.status` só muda quando o
 * operador confirma (ver `PATCH /api/afiliados/fila/[id]`, regra
 * `escala.gatilho`). Mão única: `ESCALANDO` nunca volta a `TESTANDO`
 * (`src/lib/afiliados/campanha-status.ts`).
 */

export const REGRA_ESCALA_GATILHO = "escala.gatilho"

export function avaliarGatilhoEscala(input: {
  numVendasAprovadas: number
  roiReal: number | null
  volumeMinimo: number
  roiMinimoFolga: number
}): boolean {
  if (input.roiReal == null) return false
  return input.numVendasAprovadas >= input.volumeMinimo && input.roiReal >= input.roiMinimoFolga
}

export async function avaliarRegraEscala(client: PrismaClient, campanhaId: string): Promise<void> {
  const campanha = await client.campanha.findUnique({
    where: { id: campanhaId },
    select: { id: true, status: true, roiReal: true, produtoId: true },
  })
  if (!campanha || campanha.status !== "TESTANDO") return

  const [numVendasAprovadas, volumeMinimo, roiMinimoFolga] = await Promise.all([
    client.vendaAfiliado.count({ where: { campanhaId, status: "APROVADA" } }),
    getLimiar(client, "escala.volumeMinimoVendas", { produtoId: campanha.produtoId }),
    getLimiar(client, "escala.roiMinimoFolga", { produtoId: campanha.produtoId }),
  ])
  const roiReal = campanha.roiReal != null ? decimalNum(campanha.roiReal) : null

  if (!avaliarGatilhoEscala({ numVendasAprovadas, roiReal, volumeMinimo, roiMinimoFolga })) return

  await criarItemFilaComDedup(client, {
    tipoAlvo: "CAMPANHA",
    alvoId: campanhaId,
    regra: REGRA_ESCALA_GATILHO,
    prioridade: "ALTA",
    resumo: `Gatilho de escala: ${numVendasAprovadas} venda(s) aprovada(s), ROI ${(roiReal! * 100).toFixed(1)}% com folga real sobre breakeven — promover para ESCALANDO?`,
    evidencia: { numVendasAprovadas, roiReal, volumeMinimo, roiMinimoFolga },
  })
}
