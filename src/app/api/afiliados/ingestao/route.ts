import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { assertIngestToken, parseIngestaoEnvelope } from "@/lib/afiliados/ingestao"
import {
  processarCampanhaDiario,
  processarSegmento,
  processarSerieTermo,
  registrarColetaFalha,
  registrarColetaSucesso,
} from "@/lib/afiliados/ingestao-processar"

/**
 * Endpoint único de ingestão de dado externo (Ads Scripts, CSV, séries de
 * demanda) — despacha por `tipo`, sem rota separada por grão (D1).
 * Autenticado por AFILIADOS_INGEST_TOKEN (X-Ingest-Token), distinto de
 * N8N_PUBLISH_TOKEN.
 */
export async function POST(req: Request) {
  const tokenError = assertIngestToken(req)
  if (tokenError) return tokenError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corpo inválido — JSON esperado" }, { status: 422 })
  }

  const parsed = parseIngestaoEnvelope(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 })
  }
  const { envelope } = parsed

  if ("erro" in envelope) {
    await registrarColetaFalha(db, envelope)
    return NextResponse.json({ ok: true, registrado: "FALHA" })
  }

  try {
    if (envelope.tipo === "CAMPANHA_DIARIO") {
      const resumo = await processarCampanhaDiario(db, envelope.fonte, envelope)
      await registrarColetaSucesso(db, envelope.fonte, envelope.tipo, envelope.periodo)
      return NextResponse.json({ ok: true, ...resumo })
    }

    if (envelope.tipo === "SEGMENTO") {
      const resumo = await processarSegmento(db, envelope.fonte, envelope)
      await registrarColetaSucesso(db, envelope.fonte, envelope.tipo, envelope.periodo)
      return NextResponse.json({ ok: true, ...resumo })
    }

    // SERIE_TERMO
    const resumo = await processarSerieTermo(db, envelope)
    await registrarColetaSucesso(db, envelope.fonte, envelope.tipo, envelope.periodo)
    return NextResponse.json({ ok: true, ...resumo })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json({ error: err.message ?? "Erro ao processar envelope" }, { status: 500 })
  }
}
