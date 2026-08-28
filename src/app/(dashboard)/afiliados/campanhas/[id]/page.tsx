import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import { avaliarRitmoEntrega } from "@/lib/afiliados/regras/mensuracao-escala"
import { DISPOSITIVOS_ACIONAVEIS } from "@/lib/afiliados/regras/segmento"
import { CampanhaFichaClient, type CampanhaFichaData } from "./CampanhaFichaClient"

export default async function CampanhaFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inicioMes = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))

  const [campanha, itensFila, segmentosMes, ajustes] = await Promise.all([
    db.campanha.findUnique({
      where: { id },
      include: {
        produto: { select: { id: true, slug: true, nome: true } },
        contaTrafego: { select: { id: true, slug: true, nome: true } },
        snapshots: { orderBy: { dataSnapshot: "desc" } },
        statusLogs: { orderBy: { data: "desc" } },
      },
    }),
    db.itemFila.findMany({
      where: { tipoAlvo: "CAMPANHA", alvoId: id, status: "ABERTO" },
      orderBy: { createdAt: "desc" },
    }),
    db.segmentoCampanhaSnapshot.findMany({
      where: { campanhaId: id, data: { gte: inicioMes } },
      select: { dimensao: true, valor: true, gasto: true, conversoes: true, cpaReal: true },
    }),
    db.ajusteCampanha.findMany({ where: { campanhaId: id }, orderBy: { data: "desc" } }),
  ])
  if (!campanha) notFound()

  // Agrega por (dimensao, valor) no mês corrente; dispositivo filtrado para os 3 valores acionáveis.
  const segmentosAgregados = new Map<string, { dimensao: string; valor: string; gasto: number; conversoes: number }>()
  for (const s of segmentosMes) {
    if (s.dimensao === "DISPOSITIVO" && !DISPOSITIVOS_ACIONAVEIS.includes(s.valor as (typeof DISPOSITIVOS_ACIONAVEIS)[number])) {
      continue
    }
    const key = `${s.dimensao}::${s.valor}`
    const atual = segmentosAgregados.get(key) ?? { dimensao: s.dimensao, valor: s.valor, gasto: 0, conversoes: 0 }
    atual.gasto += s.gasto != null ? decimalNum(s.gasto) : 0
    atual.conversoes += s.conversoes != null ? decimalNum(s.conversoes) : 0
    segmentosAgregados.set(key, atual)
  }

  const payload: CampanhaFichaData = {
    id: campanha.id,
    produtoId: campanha.produtoId,
    produto: campanha.produto,
    nomeCampanhaGoogleAds: campanha.nomeCampanhaGoogleAds,
    geo: campanha.geo,
    estrategia: campanha.estrategia,
    papelConta: campanha.papelConta,
    status: campanha.status,
    budgetDiarioDefinido: campanha.budgetDiarioDefinido != null ? decimalNum(campanha.budgetDiarioDefinido) : null,
    budgetTesteAlocado: campanha.budgetTesteAlocado != null ? decimalNum(campanha.budgetTesteAlocado) : null,
    contaTrafegoId: campanha.contaTrafegoId,
    contaTrafego: campanha.contaTrafego,
    nomeContaAds: campanha.nomeContaAds,
    dataInicio: campanha.dataInicio ? campanha.dataInicio.toISOString().slice(0, 10) : null,
    dataFim: campanha.dataFim ? campanha.dataFim.toISOString().slice(0, 10) : null,
    linkPainelGoogleAds: campanha.linkPainelGoogleAds,
    moeda: campanha.moeda,
    linkBridge: campanha.linkBridge,
    tipoBridge: campanha.tipoBridge,
    bridgeObservacoes: campanha.bridgeObservacoes,
    motivoEncerramento: campanha.motivoEncerramento,
    gastoTotalAcumulado: campanha.gastoTotalAcumulado != null ? decimalNum(campanha.gastoTotalAcumulado) : null,
    receitaConfirmadaAcumulada:
      campanha.receitaConfirmadaAcumulada != null ? decimalNum(campanha.receitaConfirmadaAcumulada) : null,
    roiReal: campanha.roiReal != null ? decimalNum(campanha.roiReal) : null,
    cpaReal: campanha.cpaReal != null ? decimalNum(campanha.cpaReal) : null,
    snapshots: campanha.snapshots.map((s) => ({
      id: s.id,
      dataSnapshot: s.dataSnapshot.toISOString().slice(0, 10),
      gasto: s.gasto != null ? decimalNum(s.gasto) : null,
      receitaConfirmada: s.receitaConfirmada != null ? decimalNum(s.receitaConfirmada) : null,
      roiReal: s.roiReal != null ? decimalNum(s.roiReal) : null,
      cpaReal: s.cpaReal != null ? decimalNum(s.cpaReal) : null,
      checkoutsCount: s.checkoutsCount,
    })),
    statusLogs: campanha.statusLogs.map((l) => ({
      id: l.id,
      statusAnterior: l.statusAnterior,
      statusNovo: l.statusNovo,
      motivo: l.motivo,
      data: l.data.toISOString(),
    })),
    itensFila: itensFila.map((i) => ({
      id: i.id,
      regra: i.regra,
      prioridade: i.prioridade,
      resumo: i.resumo,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
    ritmoEntrega:
      campanha.status === "ESCALANDO"
        ? avaliarRitmoEntrega(
            campanha.snapshots[0]?.gasto != null ? decimalNum(campanha.snapshots[0].gasto) : null,
            campanha.budgetDiarioDefinido != null ? decimalNum(campanha.budgetDiarioDefinido) : null,
          )
        : null,
    segmentosMes: [...segmentosAgregados.values()].map((s) => ({
      dimensao: s.dimensao,
      valor: s.valor,
      gasto: s.gasto,
      conversoes: s.conversoes,
      cpaSegmento: s.conversoes > 0 ? s.gasto / s.conversoes : null,
    })),
    ajustes: ajustes.map((a) => ({
      id: a.id,
      origem: a.origem,
      tipo: a.tipo,
      valorAnterior: a.valorAnterior != null ? decimalNum(a.valorAnterior) : null,
      valorNovo: a.valorNovo != null ? decimalNum(a.valorNovo) : null,
      data: a.data.toISOString(),
      motivo: a.motivo,
    })),
  }

  return <CampanhaFichaClient initial={payload} />
}
