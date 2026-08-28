import type { PrismaClient } from "@prisma/client"
import { avaliarRegraTesteCampanha } from "./teste"
import { avaliarRegraReteste } from "./reteste"
import { avaliarRegraEscala } from "./escala"
import { avaliarMensuracaoMensal, avaliarRegraRitmoAjuste, avaliarRegraRecuo } from "./mensuracao-escala"
import { avaliarRegraSegmento } from "./segmento"

/**
 * Dispatcher central — avalia todas as regras de decisão codificadas
 * aplicáveis a uma Campanha (cada regra checa seu próprio pré-requisito de
 * status: teste/re-teste/escala só rodam em `TESTANDO`; mensuração/ritmo/
 * recuo só em `ESCALANDO`). Chamado a cada escrita relevante de
 * `CampanhaSnapshot`/`VendaAfiliado` (afiliados-regras-teste-escala).
 */
export async function avaliarRegrasCampanha(client: PrismaClient, campanhaId: string): Promise<void> {
  await avaliarRegraTesteCampanha(client, campanhaId)
  await avaliarRegraReteste(client, campanhaId)
  await avaliarRegraEscala(client, campanhaId)
  await avaliarMensuracaoMensal(client, campanhaId)
  await avaliarRegraRitmoAjuste(client, campanhaId)
  await avaliarRegraRecuo(client, campanhaId)
  await avaliarRegraSegmento(client, campanhaId)
}
