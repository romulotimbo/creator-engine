import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { assertTokenFromEnv } from "@/lib/publicacao"
import { gerarConversoesOfflineElegiveis } from "@/lib/afiliados/conversao-offline"

const TOKEN_ENV = "AFILIADOS_OFFLINE_TOKEN"
const TOKEN_HEADER = "X-Offline-Token"

/**
 * Endpoint de leitura consumido pelo Ads Script — devolve o CSV pronto para
 * `AdsApp.bulkUploads().newCsvUpload().forOfflineConversions()`. Cada
 * chamada processa as vendas elegíveis e grava `statusUploadAds` (idempotente
 * — só reprocessa vendas ainda `PENDENTE`, então chamadas repetidas não
 * duplicam envio).
 */
export async function GET(req: Request) {
  const tokenError = assertTokenFromEnv(req, TOKEN_ENV, TOKEN_HEADER)
  if (tokenError) return tokenError

  const resultado = await gerarConversoesOfflineElegiveis(db)

  return new NextResponse(resultado.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "X-Enviadas": String(resultado.enviadas.length),
      "X-Fora-Da-Janela": String(resultado.foraDaJanela.length),
      "X-Excluidas-Rede-Nativa": String(resultado.excluidasRedeNativa.length),
      "X-Retratadas": String(resultado.retratadas.length),
    },
  })
}
