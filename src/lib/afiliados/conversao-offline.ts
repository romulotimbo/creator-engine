import type { PrismaClient } from "@prisma/client"
import { getLimiar } from "@/lib/afiliados/limiares"

/**
 * Upload de conversões offline ao Google Ads via Ads Scripts (ticket 20 —
 * .scratch/afiliados-ciclo-oportunidade-escala/issues/20-upload-conversoes-offline.md).
 * Dado, não decisão — "sistema recomenda, nunca escreve" cobre o loop de
 * controle (lance/budget/pausa), não o envio de fato confirmado.
 *
 * Só venda confirmada (`status = APROVADA`) sobe — checkout NÃO sobe (já é
 * conversão nativa/tempo-real do lado do Ads). Creator Engine monta o CSV
 * pronto; o Ads Script só busca e repassa a `newCsvUpload()`.
 */

/** Config declarativa — não detecção. ClickBank empurra 3 conversion actions nativamente (Order Form Impression, Initial Purchase, Upsell). */
export const REDES_INTEGRACAO_NATIVA: ReadonlySet<string> = new Set(["CLICKBANK"])

export const JANELA_DIAS_PADRAO = 90

/** Janela de 90 dias após o clique é dura — venda confirmada além disso não sobe. */
export function estaForaDaJanela(dataClique: Date, agora: Date, janelaDias = JANELA_DIAS_PADRAO): boolean {
  return agora.getTime() - dataClique.getTime() > janelaDias * 86_400_000
}

export type LinhaConversaoCsv = {
  identificadorTipo: string
  identificadorValor: string
  conversionTime: Date
  retraction: boolean
}

const CONVERSION_NAME = "Venda Confirmada"

export function formatarConversionTime(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`
}

/**
 * CSV pronto para `AdsApp.bulkUploads().newCsvUpload(cols, {timeZone}).forOfflineConversions()`.
 * Colunas obrigatórias (ticket 20): `Google Click ID`/`order_id`, `Conversion Name`,
 * `Conversion Time`, mais a linha `Parameters:TimeZone=`. `Retraction` marca
 * as linhas de estorno.
 */
export function gerarCsvConversoesOffline(linhas: LinhaConversaoCsv[], timeZone: string): string {
  const cabecalhoParams = `Parameters:TimeZone=${timeZone}`
  const cabecalhoColunas = "Google Click ID,order_id,Conversion Name,Conversion Time,Retraction"
  const corpo = linhas.map((l) => {
    const ehGclid = l.identificadorTipo.toUpperCase() === "GCLID"
    const gclid = ehGclid ? l.identificadorValor : ""
    const orderId = ehGclid ? "" : l.identificadorValor
    return [gclid, orderId, CONVERSION_NAME, formatarConversionTime(l.conversionTime, timeZone), l.retraction ? "TRUE" : ""].join(",")
  })
  return [cabecalhoParams, cabecalhoColunas, ...corpo].join("\n")
}

export type ResultadoGeracaoCsv = {
  csv: string
  enviadas: string[]
  foraDaJanela: string[]
  excluidasRedeNativa: string[]
  retratadas: string[]
}

/**
 * Gera o CSV de conversões offline elegíveis e grava `statusUploadAds` de
 * cada venda processada — nunca silencioso (toda venda considerada sai com
 * um status explícito). Também emite retratações para vendas já enviadas
 * que viraram `ESTORNADA`.
 */
export async function gerarConversoesOfflineElegiveis(
  client: PrismaClient,
  agora: Date = new Date(),
  timeZone = "America/Sao_Paulo",
): Promise<ResultadoGeracaoCsv> {
  const linhas: LinhaConversaoCsv[] = []
  const enviadas: string[] = []
  const foraDaJanela: string[] = []
  const excluidasRedeNativa: string[] = []
  const retratadas: string[] = []

  const vendas = await client.vendaAfiliado.findMany({
    where: { status: "APROVADA", statusUploadAds: "PENDENTE" },
    select: {
      id: true,
      campanhaId: true,
      data: true,
      tipoIdentificador: true,
      valorIdentificador: true,
      plataformaAfil: true,
    },
  })

  for (const v of vendas) {
    if (REDES_INTEGRACAO_NATIVA.has(v.plataformaAfil)) {
      await client.vendaAfiliado.update({ where: { id: v.id }, data: { statusUploadAds: "EXCLUIDA_REDE_NATIVA" } })
      excluidasRedeNativa.push(v.id)
      continue
    }
    if (!v.campanhaId || !v.tipoIdentificador || !v.valorIdentificador) continue // sem campanha/identificador — fica PENDENTE

    const campanha = await client.campanha.findUnique({ where: { id: v.campanhaId }, select: { status: true, produtoId: true } })
    if (!campanha) continue

    const ativoPorFase = await getLimiar(client, "conversaoOffline.ativoPorFase", { produtoId: campanha.produtoId })
    const ativo = campanha.status === "ESCALANDO" ? (ativoPorFase.ESCALANDO ?? true) : campanha.status === "TESTANDO" ? (ativoPorFase.TESTANDO ?? false) : false
    if (!ativo) continue

    if (estaForaDaJanela(v.data, agora)) {
      await client.vendaAfiliado.update({ where: { id: v.id }, data: { statusUploadAds: "FORA_DA_JANELA" } })
      foraDaJanela.push(v.id)
      continue
    }

    linhas.push({ identificadorTipo: v.tipoIdentificador, identificadorValor: v.valorIdentificador, conversionTime: v.data, retraction: false })
    await client.vendaAfiliado.update({ where: { id: v.id }, data: { statusUploadAds: "ENVIADA" } })
    enviadas.push(v.id)
  }

  // Retratação: orderId quando presente, senão (tipoIdentificador, valorIdentificador) + timestamp original.
  const vendasParaRetratar = await client.vendaAfiliado.findMany({
    where: { status: "ESTORNADA", statusUploadAds: "ENVIADA" },
    select: { id: true, data: true, orderId: true, tipoIdentificador: true, valorIdentificador: true },
  })
  for (const v of vendasParaRetratar) {
    const identificadorTipo = v.orderId ? "ORDER_ID" : v.tipoIdentificador
    const identificadorValor = v.orderId ?? v.valorIdentificador
    if (!identificadorTipo || !identificadorValor) continue

    linhas.push({ identificadorTipo, identificadorValor, conversionTime: v.data, retraction: true })
    await client.vendaAfiliado.update({ where: { id: v.id }, data: { statusUploadAds: "RETRATADA" } })
    retratadas.push(v.id)
  }

  return { csv: gerarCsvConversoesOffline(linhas, timeZone), enviadas, foraDaJanela, excluidasRedeNativa, retratadas }
}
