import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { normalizeCampaignName, parseCampanhaPerformanceCsv } from "@/lib/afiliados/campanha-csv"
import { recomputeProdutoRollups } from "@/lib/afiliados/rollups"

type Params = { params: Promise<{ id: string }> }

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: produtoId } = await params
  const produto = await db.produtoAfiliado.findUnique({ where: { id: produtoId } })
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

  try {
    const form = await req.formData()
    const file = form.get("file")
    const dataSnapshotRaw = form.get("dataSnapshot")
    const dataSnapshot = startOfDay(
      dataSnapshotRaw && typeof dataSnapshotRaw === "string" && dataSnapshotRaw
        ? new Date(dataSnapshotRaw)
        : new Date(),
    )

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo CSV obrigatório (campo file)" }, { status: 422 })
    }

    const text = await file.text()
    const rows = parseCampanhaPerformanceCsv(text)

    const existentes = await db.campanha.findMany({
      where: { produtoId },
      select: { id: true, nomeCampanhaGoogleAds: true },
    })
    const byName = new Map(existentes.map((c) => [normalizeCampaignName(c.nomeCampanhaGoogleAds), c.id]))

    let criadas = 0
    let snapshotsCriados = 0
    let snapshotsSubstituidos = 0
    const invalidas: { nome: string; motivo: string }[] = []

    for (const row of rows) {
      if (row.invalidReason || !row.nomeCampanhaGoogleAds) {
        invalidas.push({ nome: row.nomeCampanhaGoogleAds || "(vazio)", motivo: row.invalidReason || "Inválida" })
        continue
      }

      const key = normalizeCampaignName(row.nomeCampanhaGoogleAds)
      let campanhaId = byName.get(key)
      if (!campanhaId) {
        const created = await db.campanha.create({
          data: {
            produtoId,
            nomeCampanhaGoogleAds: row.nomeCampanhaGoogleAds,
            status: "TESTANDO",
          },
        })
        campanhaId = created.id
        byName.set(key, campanhaId)
        criadas += 1
        if (!produto.dataInicioTeste) {
          await db.produtoAfiliado.update({
            where: { id: produtoId },
            data: { dataInicioTeste: dataSnapshot },
          })
          produto.dataInicioTeste = dataSnapshot
        }
      }

      const existingSnap = await db.campanhaSnapshot.findUnique({
        where: { campanhaId_dataSnapshot: { campanhaId, dataSnapshot } },
      })

      await db.campanhaSnapshot.upsert({
        where: { campanhaId_dataSnapshot: { campanhaId, dataSnapshot } },
        create: {
          campanhaId,
          dataSnapshot,
          gasto: row.gasto,
          impressoes: row.impressoes,
          cliques: row.cliques,
          ctr: row.ctr,
          conversoes: row.conversoes,
          cvr: row.cvr,
          cpcMedio: row.cpcMedio,
          cpaReal: row.cpaReal,
          receitaConfirmada: row.receitaConfirmada,
          roiReal: row.roiReal,
        },
        update: {
          gasto: row.gasto,
          impressoes: row.impressoes,
          cliques: row.cliques,
          ctr: row.ctr,
          conversoes: row.conversoes,
          cvr: row.cvr,
          cpcMedio: row.cpcMedio,
          cpaReal: row.cpaReal,
          receitaConfirmada: row.receitaConfirmada,
          roiReal: row.roiReal,
        },
      })

      if (existingSnap) snapshotsSubstituidos += 1
      else snapshotsCriados += 1

      await db.campanha.update({
        where: { id: campanhaId },
        data: { dataUltimaAtualizacao: dataSnapshot },
      })
    }

    await recomputeProdutoRollups(db, produtoId)

    return NextResponse.json({
      ok: true,
      dataSnapshot: dataSnapshot.toISOString().slice(0, 10),
      campanhasCriadas: criadas,
      snapshotsCriados,
      snapshotsSubstituidos,
      linhasInvalidas: invalidas,
    })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json({ error: err.message ?? "Erro ao importar CSV" }, { status: 400 })
  }
}
