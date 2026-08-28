import type { PrismaClient, TipoIngestao } from "@prisma/client"
import type {
  EnvelopeCampanhaDiario,
  EnvelopeFalha,
  EnvelopeSegmento,
  EnvelopeSerieTermo,
  LinhaCampanhaDiario,
  LinhaSegmento,
} from "./ingestao"
import { recomputeCampanhaRollups } from "./rollups"
import { avaliarRegrasCampanha } from "./regras"
import { avaliarRegraCurvaAscendente } from "./regras/curva-ascendente"

export type ProcessamentoResumo = {
  tipo: TipoIngestao
  snapshotsUpsertados?: number
  materializados?: number
  naoReconciliados?: number
  seriesUpsertadas?: number
  seriesNaoResolvidas?: number
}

function chaveCampanha(googleAdsCustomerId: string, nomeCampanhaGoogleAds: string) {
  return `${googleAdsCustomerId}::${nomeCampanhaGoogleAds}`
}

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function toDateKey(d: Date): string {
  return toDateOnly(d).toISOString().slice(0, 10)
}

function diasNoPeriodo(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = []
  const cursor = toDateOnly(inicio)
  const end = toDateOnly(fim)
  while (cursor.getTime() <= end.getTime()) {
    dias.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dias
}

/**
 * Resolve (googleAdsCustomerId, nomeCampanhaGoogleAds) → Campanha.id, sem
 * auto-criação (D3). Pares sem Campanha correspondente ficam ausentes do mapa.
 */
async function resolverCampanhas(
  client: PrismaClient,
  pares: { googleAdsCustomerId: string; nomeCampanhaGoogleAds: string }[],
): Promise<Map<string, string>> {
  const customerIds = [...new Set(pares.map((p) => p.googleAdsCustomerId))]
  if (!customerIds.length) return new Map()

  const contas = await client.contaTrafego.findMany({
    where: { googleAdsCustomerId: { in: customerIds } },
    select: { id: true, googleAdsCustomerId: true },
  })
  const contaPorCustomerId = new Map(
    contas.filter((c) => c.googleAdsCustomerId).map((c) => [c.googleAdsCustomerId as string, c.id]),
  )
  const contaIds = [...new Set(contaPorCustomerId.values())]
  if (!contaIds.length) return new Map()

  const nomes = [...new Set(pares.map((p) => p.nomeCampanhaGoogleAds))]
  const campanhas = await client.campanha.findMany({
    where: { contaTrafegoId: { in: contaIds }, nomeCampanhaGoogleAds: { in: nomes } },
    select: { id: true, contaTrafegoId: true, nomeCampanhaGoogleAds: true },
  })

  const resultado = new Map<string, string>()
  for (const par of pares) {
    const contaId = contaPorCustomerId.get(par.googleAdsCustomerId)
    if (!contaId) continue
    const campanha = campanhas.find(
      (c) => c.contaTrafegoId === contaId && c.nomeCampanhaGoogleAds === par.nomeCampanhaGoogleAds,
    )
    if (campanha) {
      resultado.set(chaveCampanha(par.googleAdsCustomerId, par.nomeCampanhaGoogleAds), campanha.id)
    }
  }
  return resultado
}

/** Upsert de uma linha CAMPANHA_DIARIO já casada com uma Campanha — chave natural (campanhaId, dataSnapshot). */
export async function upsertCampanhaDiarioLinha(
  client: PrismaClient,
  campanhaId: string,
  linha: LinhaCampanhaDiario,
): Promise<void> {
  const dataSnapshot = toDateOnly(linha.dataSnapshot)
  const dados = {
    gasto: linha.gasto ?? null,
    impressoes: linha.impressoes ?? null,
    cliques: linha.cliques ?? null,
    ctr: linha.ctr ?? null,
    conversoes: linha.conversoes ?? null,
    cvr: linha.cvr ?? null,
    cpcMedio: linha.cpcMedio ?? null,
    cpaReal: linha.cpaReal ?? null,
    receitaConfirmada: linha.receitaConfirmada ?? null,
    roiReal: linha.roiReal ?? null,
    checkoutsCount: linha.checkoutsCount ?? null,
  }
  await client.campanhaSnapshot.upsert({
    where: { campanhaId_dataSnapshot: { campanhaId, dataSnapshot } },
    update: dados,
    create: { campanhaId, dataSnapshot, ...dados },
  })
}

/** Upsert de uma linha SEGMENTO já casada com uma Campanha — chave natural (campanhaId, dimensao, valor, data). */
export async function upsertSegmentoLinha(
  client: PrismaClient,
  campanhaId: string,
  linha: LinhaSegmento,
): Promise<void> {
  const data = toDateOnly(linha.data)
  const dados = {
    gasto: linha.gasto ?? null,
    cliques: linha.cliques ?? null,
    conversoes: linha.conversoes ?? null,
    cpaReal: linha.cpaReal ?? null,
  }
  await client.segmentoCampanhaSnapshot.upsert({
    where: { campanhaId_dimensao_valor_data: { campanhaId, dimensao: linha.dimensao, valor: linha.valor, data } },
    update: dados,
    create: { campanhaId, dimensao: linha.dimensao, valor: linha.valor, data, ...dados },
  })
}

export async function processarCampanhaDiario(
  client: PrismaClient,
  fonte: string,
  envelope: EnvelopeCampanhaDiario,
): Promise<ProcessamentoResumo> {
  const pares = [
    ...envelope.campanhasCobertas,
    ...envelope.linhas.map((l) => ({
      googleAdsCustomerId: l.googleAdsCustomerId,
      nomeCampanhaGoogleAds: l.nomeCampanhaGoogleAds,
    })),
  ]
  const mapa = await resolverCampanhas(client, pares)

  let snapshotsUpsertados = 0
  let naoReconciliados = 0
  const campanhasTocadas = new Set<string>()

  for (const linha of envelope.linhas) {
    const campanhaId = mapa.get(chaveCampanha(linha.googleAdsCustomerId, linha.nomeCampanhaGoogleAds))
    if (!campanhaId) {
      await client.campanhaNaoReconciliada.create({
        data: {
          fonte,
          tipo: "CAMPANHA_DIARIO",
          googleAdsCustomerId: linha.googleAdsCustomerId,
          nomeCampanhaGoogleAds: linha.nomeCampanhaGoogleAds,
          linhaBruta: linha as unknown as object,
        },
      })
      naoReconciliados++
      continue
    }

    await upsertCampanhaDiarioLinha(client, campanhaId, linha)
    snapshotsUpsertados++
    campanhasTocadas.add(campanhaId)
  }

  // Materialização de calendário (D2): campanhasCobertas × período sem linha → zero.
  // Não sobrescreve linhas já persistidas (nesta chamada ou em execuções anteriores).
  let materializados = 0
  const dias = diasNoPeriodo(envelope.periodo.inicio, envelope.periodo.fim)

  for (const coberta of envelope.campanhasCobertas) {
    const campanhaId = mapa.get(chaveCampanha(coberta.googleAdsCustomerId, coberta.nomeCampanhaGoogleAds))
    if (!campanhaId) continue

    const existentes = await client.campanhaSnapshot.findMany({
      where: {
        campanhaId,
        dataSnapshot: { gte: dias[0], lte: dias[dias.length - 1] },
      },
      select: { dataSnapshot: true },
    })
    const existentesKeys = new Set(existentes.map((s) => toDateKey(s.dataSnapshot)))

    const faltantes = dias.filter((d) => !existentesKeys.has(toDateKey(d)))
    if (!faltantes.length) continue

    await client.campanhaSnapshot.createMany({
      data: faltantes.map((dataSnapshot) => ({
        campanhaId,
        dataSnapshot,
        gasto: 0,
        impressoes: 0,
        cliques: 0,
        ctr: 0,
        conversoes: 0,
        cvr: 0,
        cpcMedio: 0,
        cpaReal: 0,
        receitaConfirmada: 0,
        roiReal: 0,
        checkoutsCount: 0,
      })),
      skipDuplicates: true,
    })
    materializados += faltantes.length
    campanhasTocadas.add(campanhaId)
  }

  // Recompute de rollup + regras de decisão para toda campanha tocada nesta ingestão.
  for (const campanhaId of campanhasTocadas) {
    await recomputeCampanhaRollups(client, campanhaId)
    await avaliarRegrasCampanha(client, campanhaId)
  }

  return { tipo: "CAMPANHA_DIARIO", snapshotsUpsertados, materializados, naoReconciliados }
}

export async function processarSegmento(
  client: PrismaClient,
  fonte: string,
  envelope: EnvelopeSegmento,
): Promise<ProcessamentoResumo> {
  const pares = [
    ...envelope.campanhasCobertas,
    ...envelope.linhas.map((l) => ({
      googleAdsCustomerId: l.googleAdsCustomerId,
      nomeCampanhaGoogleAds: l.nomeCampanhaGoogleAds,
    })),
  ]
  const mapa = await resolverCampanhas(client, pares)

  let snapshotsUpsertados = 0
  let naoReconciliados = 0
  const campanhasTocadas = new Set<string>()

  for (const linha of envelope.linhas) {
    const campanhaId = mapa.get(chaveCampanha(linha.googleAdsCustomerId, linha.nomeCampanhaGoogleAds))
    if (!campanhaId) {
      await client.campanhaNaoReconciliada.create({
        data: {
          fonte,
          tipo: "SEGMENTO",
          googleAdsCustomerId: linha.googleAdsCustomerId,
          nomeCampanhaGoogleAds: linha.nomeCampanhaGoogleAds,
          linhaBruta: linha as unknown as object,
        },
      })
      naoReconciliados++
      continue
    }

    await upsertSegmentoLinha(client, campanhaId, linha)
    snapshotsUpsertados++
    campanhasTocadas.add(campanhaId)
  }

  for (const campanhaId of campanhasTocadas) {
    await avaliarRegrasCampanha(client, campanhaId)
  }

  return { tipo: "SEGMENTO", snapshotsUpsertados, naoReconciliados }
}

export async function processarSerieTermo(
  client: PrismaClient,
  envelope: EnvelopeSerieTermo,
): Promise<ProcessamentoResumo> {
  const termoIds = [...new Set(envelope.linhas.map((l) => l.termoId))]
  const termos = await client.termo.findMany({ where: { id: { in: termoIds } }, select: { id: true, ofertaDecisaoId: true } })
  const termosValidos = new Map(termos.map((t) => [t.id, t.ofertaDecisaoId]))

  let seriesUpsertadas = 0
  let seriesNaoResolvidas = 0
  const ofertasTocadas = new Set<string>()

  for (const linha of envelope.linhas) {
    if (!termosValidos.has(linha.termoId)) {
      seriesNaoResolvidas++
      continue
    }
    const data = toDateOnly(linha.data)
    await client.serieTermo.upsert({
      where: { termoId_geo_fonte_data: { termoId: linha.termoId, geo: linha.geo, fonte: linha.fonte, data } },
      update: { valor: linha.valor ?? null, unidade: linha.unidade, origem: "automatizado" },
      create: {
        termoId: linha.termoId,
        geo: linha.geo,
        fonte: linha.fonte,
        data,
        valor: linha.valor ?? null,
        unidade: linha.unidade,
        origem: "automatizado",
      },
    })
    seriesUpsertadas++
    const ofertaId = termosValidos.get(linha.termoId)
    if (ofertaId) ofertasTocadas.add(ofertaId)
  }

  for (const ofertaId of ofertasTocadas) {
    await avaliarRegraCurvaAscendente(client, ofertaId)
  }

  return { tipo: "SERIE_TERMO", seriesUpsertadas, seriesNaoResolvidas }
}

export async function registrarColetaSucesso(
  client: PrismaClient,
  fonte: string,
  tipo: TipoIngestao,
  periodo: { inicio: Date; fim: Date } | null,
): Promise<void> {
  await client.registroColeta.upsert({
    where: { fonte_tipo: { fonte, tipo } },
    update: {
      ultimaExecucaoEm: new Date(),
      ultimoPeriodoCoberto: periodo ? { inicio: periodo.inicio.toISOString(), fim: periodo.fim.toISOString() } : undefined,
      ultimoStatus: "SUCESSO",
      ultimoErro: null,
    },
    create: {
      fonte,
      tipo,
      ultimaExecucaoEm: new Date(),
      ultimoPeriodoCoberto: periodo ? { inicio: periodo.inicio.toISOString(), fim: periodo.fim.toISOString() } : undefined,
      ultimoStatus: "SUCESSO",
    },
  })
}

export async function registrarColetaFalha(client: PrismaClient, envelope: EnvelopeFalha): Promise<void> {
  await client.registroColeta.upsert({
    where: { fonte_tipo: { fonte: envelope.fonte, tipo: envelope.tipo } },
    update: { ultimoStatus: "FALHA", ultimoErro: envelope.erro },
    create: { fonte: envelope.fonte, tipo: envelope.tipo, ultimoStatus: "FALHA", ultimoErro: envelope.erro },
  })
}
