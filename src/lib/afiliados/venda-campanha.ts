import type { PrismaClient } from "@prisma/client"

/**
 * Atribuição de venda à campanha por subid = Campanha.id, sem tabela de lookup
 * (D5, design.md). `campanhaId` explícito (atribuição manual na UI) tem
 * precedência; senão, casa `valorIdentificador` diretamente contra Campanha.id.
 * Nunca infere por produto+conta+janela de data — sem match, fica null até
 * atribuição manual.
 */
export async function resolveCampanhaId(
  client: PrismaClient,
  input: { campanhaId?: string | null; valorIdentificador?: string | null },
): Promise<string | null> {
  if (input.campanhaId) return input.campanhaId
  if (input.valorIdentificador) {
    const campanha = await client.campanha.findUnique({
      where: { id: input.valorIdentificador },
      select: { id: true },
    })
    if (campanha) return campanha.id
  }
  return null
}
