import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { itemFilaAcaoSchema, STATUS_ITEM_FILA_TERMINAIS, ajustesDaConfirmacao } from "@/lib/afiliados/fila"
import { REGRA_ESCALA_GATILHO } from "@/lib/afiliados/regras/escala"
import { mudarStatusCampanha, TransicaoInvalidaError } from "@/lib/afiliados/campanha-status"
import { avaliarRegrasCampanha } from "@/lib/afiliados/regras"

type Params = { params: Promise<{ id: string }> }

/** Confirmar (→ APLICADO, opcionalmente registrando AjusteCampanha), adiar ou dispensar um ItemFila. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const acao = itemFilaAcaoSchema.parse(await req.json())

    const item = await db.itemFila.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
    if (STATUS_ITEM_FILA_TERMINAIS.includes(item.status as (typeof STATUS_ITEM_FILA_TERMINAIS)[number])) {
      return NextResponse.json({ error: "Item já está em estado terminal" }, { status: 409 })
    }

    if (acao.acao === "adiar") {
      const updated = await db.itemFila.update({ where: { id }, data: { status: "ADIADO" } })
      return NextResponse.json(updated)
    }

    if (acao.acao === "dispensar") {
      const updated = await db.itemFila.update({
        where: { id },
        data: { status: "DISPENSADO", resolvidoEm: new Date() },
      })
      return NextResponse.json(updated)
    }

    // confirmar
    const ajustes = ajustesDaConfirmacao(acao)
    if (ajustes.length && item.tipoAlvo !== "CAMPANHA") {
      return NextResponse.json({ error: "Ajuste só se aplica a itens de campanha (tipoAlvo=CAMPANHA)" }, { status: 422 })
    }

    const updated = await db.itemFila.update({
      where: { id },
      data: { status: "APLICADO", resolvidoEm: new Date() },
    })

    // Gatilho de escala (ticket 09): confirmação é o único jeito de promover
    // TESTANDO → ESCALANDO — nunca automático.
    if (item.regra === REGRA_ESCALA_GATILHO && item.tipoAlvo === "CAMPANHA") {
      await mudarStatusCampanha(db, item.alvoId, "ESCALANDO", "Confirmado via fila de decisão (gatilho de escala)")
    }

    // Um item pode empacotar vários achados (ex.: geo+dispositivo) — um
    // AjusteCampanha por segmento confirmado, todos referenciando este item.
    for (const ajuste of ajustes) {
      await db.ajusteCampanha.create({
        data: {
          campanhaId: item.alvoId,
          itemFilaId: item.id,
          origem: "FILA",
          tipo: ajuste.tipoAjuste,
          valorAnterior: ajuste.valorAnterior ?? null,
          valorNovo: ajuste.valorAplicado,
          motivo: ajuste.motivo || null,
        },
      })
    }

    if (item.tipoAlvo === "CAMPANHA") {
      await avaliarRegrasCampanha(db, item.alvoId)
    }

    return NextResponse.json(updated)
  } catch (e: unknown) {
    if (e instanceof TransicaoInvalidaError) {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao processar ação" }, { status: 400 })
  }
}
