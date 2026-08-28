import type { PrismaClient } from "@prisma/client"
import { decimalNum } from "@/lib/afiliados"
import { criarItemFilaComDedup } from "@/lib/afiliados/fila"
import { getLimiar } from "@/lib/afiliados/limiares"

/**
 * Mensuração de escala mensal, ritmo de entrega e regra dos 5-10% (ticket 10 —
 * .scratch/afiliados-ciclo-oportunidade-escala/issues/10-regras-escala-mensuracao-ritmo.md).
 */

function inicioMes(ano: number, mes0: number): Date {
  return new Date(Date.UTC(ano, mes0, 1))
}
function fimMes(ano: number, mes0: number): Date {
  return new Date(Date.UTC(ano, mes0 + 1, 0, 23, 59, 59, 999))
}
function chaveMes(ano: number, mes0: number): string {
  return `${ano}-${String(mes0 + 1).padStart(2, "0")}`
}

/** Mês calendário mais recentemente fechado, relativo a `agora`. */
export function mesReferenciaFechado(agora: Date = new Date()): { inicio: Date; fim: Date; chave: string } {
  const ano = agora.getUTCFullYear()
  const mes0 = agora.getUTCMonth()
  const mesAnterior0 = mes0 === 0 ? 11 : mes0 - 1
  const anoAnterior = mes0 === 0 ? ano - 1 : ano
  return { inicio: inicioMes(anoAnterior, mesAnterior0), fim: fimMes(anoAnterior, mesAnterior0), chave: chaveMes(anoAnterior, mesAnterior0) }
}

export type RoiJanela = { gasto: number; receita: number; roi: number | null }

export function calcularRoiJanela(gasto: number, receita: number): RoiJanela {
  return { gasto, receita, roi: gasto > 0 ? (receita - gasto) / gasto : null }
}

async function somaGastoEReceita(
  client: PrismaClient,
  campanhaId: string,
  inicio: Date,
  fim: Date,
): Promise<{ gasto: number; receita: number }> {
  const [snapshots, vendas] = await Promise.all([
    client.campanhaSnapshot.findMany({
      where: { campanhaId, dataSnapshot: { gte: inicio, lte: fim } },
      select: { gasto: true },
    }),
    client.vendaAfiliado.findMany({
      where: { campanhaId, status: "APROVADA", data: { gte: inicio, lte: fim } },
      select: { valorComissao: true },
    }),
  ])
  const gasto = snapshots.reduce((acc, s) => acc + (s.gasto != null ? decimalNum(s.gasto) : 0), 0)
  const receita = vendas.reduce((acc, v) => acc + decimalNum(v.valorComissao), 0)
  return { gasto, receita }
}

/**
 * Corte de continuidade mensal — binário, sem zona intermediária. ROI < limiar
 * → ItemFila de diagnóstico keep/kill (nunca recuo automático). Dedup por mês
 * embutido no nome da regra (mesmo padrão de `escala.otimizacaoSegmento`).
 */
export async function avaliarMensuracaoMensal(client: PrismaClient, campanhaId: string, agora: Date = new Date()): Promise<void> {
  const campanha = await client.campanha.findUnique({
    where: { id: campanhaId },
    select: { id: true, status: true, produtoId: true },
  })
  if (!campanha || campanha.status !== "ESCALANDO") return

  const mes = mesReferenciaFechado(agora)
  const { gasto, receita } = await somaGastoEReceita(client, campanhaId, mes.inicio, mes.fim)
  if (gasto <= 0) return // sem gasto no mês fechado — nada a diagnosticar

  const { roi } = calcularRoiJanela(gasto, receita)
  const limiar = await getLimiar(client, "escala.roiMinimoMensal", { produtoId: campanha.produtoId })
  if (roi == null || roi >= limiar) return

  await criarItemFilaComDedup(client, {
    tipoAlvo: "CAMPANHA",
    alvoId: campanhaId,
    regra: `escala.mensuracaoMensal:${mes.chave}`,
    prioridade: "ALTA",
    resumo: `Fechamento de ${mes.chave}: ROI mensal ${(roi * 100).toFixed(1)}% abaixo do limiar de continuidade — diagnóstico keep/kill (Falha de Execução vs. Falha de Mercado).`,
    evidencia: { mesReferencia: mes.chave, gasto, receita, roi, limiar },
  })
}

/**
 * ROI da semana corrente — leitura auxiliar de tendência dentro do mês,
 * NUNCA gera `ItemFila` própria (só o fechamento do mês decide).
 */
export async function roiSemanalAuxiliar(client: PrismaClient, campanhaId: string, agora: Date = new Date()): Promise<RoiJanela> {
  const diaSemana = agora.getUTCDay() === 0 ? 6 : agora.getUTCDay() - 1 // segunda=0
  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() - diaSemana))
  const fim = new Date(inicio.getTime() + 7 * 86_400_000 - 1)
  const { gasto, receita } = await somaGastoEReceita(client, campanhaId, inicio, fim)
  return calcularRoiJanela(gasto, receita)
}

export type StatusRitmoEntrega = "ABAIXO" | "NORMAL" | "ACIMA" | "SEM_BUDGET"

/**
 * Alerta de ritmo de entrega — puramente informativo, nunca gera `ItemFila`.
 * `alertaOrcamentoEstourado` (teto de teste) não se aplica em `ESCALANDO`.
 * Faixas de calibração inicial (sem dado real ainda, ajustável): abaixo de
 * 50% do budget diário = campanha parou de entregar; acima de 150% = overdelivery.
 */
export function avaliarRitmoEntrega(gastoDia: number | null, budgetDiario: number | null): StatusRitmoEntrega {
  if (budgetDiario == null || budgetDiario <= 0) return "SEM_BUDGET"
  const gasto = gastoDia ?? 0
  if (gasto < budgetDiario * 0.5) return "ABAIXO"
  if (gasto > budgetDiario * 1.5) return "ACIMA"
  return "NORMAL"
}

const REGRA_RECUO_PREFIXO = "escala.recuo:"

/**
 * Regra dos 5-10%: item único cobrindo budget diário e CPA alvo juntos.
 * Dispara quando ≥24h desde o último `AjusteCampanha` (ou desde a entrada em
 * ESCALANDO, se ainda não houve ajuste). Pausa enquanto houver um item de
 * recuo aberto para a campanha (ticket 10, item 4).
 */
export async function avaliarRegraRitmoAjuste(client: PrismaClient, campanhaId: string, agora: Date = new Date()): Promise<void> {
  const campanha = await client.campanha.findUnique({ where: { id: campanhaId }, select: { id: true, status: true } })
  if (!campanha || campanha.status !== "ESCALANDO") return

  const recuoAtivo = await client.itemFila.findFirst({
    where: {
      tipoAlvo: "CAMPANHA",
      alvoId: campanhaId,
      regra: { startsWith: REGRA_RECUO_PREFIXO },
      status: { notIn: ["APLICADO", "DISPENSADO", "EXPIRADO"] },
    },
  })
  if (recuoAtivo) return

  const [ultimoAjuste, logEscalada] = await Promise.all([
    client.ajusteCampanha.findFirst({
      where: { campanhaId, tipo: { in: ["BUDGET", "CPA_ALVO"] } },
      orderBy: { data: "desc" },
      select: { data: true },
    }),
    client.campanhaStatusLog.findFirst({
      where: { campanhaId, statusNovo: "ESCALANDO" },
      orderBy: { data: "desc" },
      select: { data: true },
    }),
  ])
  const ancora = ultimoAjuste?.data ?? logEscalada?.data
  if (!ancora) return
  if (agora.getTime() - ancora.getTime() < 24 * 3_600_000) return

  await criarItemFilaComDedup(client, {
    tipoAlvo: "CAMPANHA",
    alvoId: campanhaId,
    regra: "escala.ajuste5a10",
    prioridade: "MEDIA",
    resumo: "Regra dos 5-10%: subir budget diário e CPA alvo juntos, dentro da faixa de 5% a 10% (otimizar segmentos antes, se ainda não feito).",
    evidencia: { ancora: ancora.toISOString() },
  })
}

/**
 * Recuo: janela fixa de 3 dias pós-ajuste vs. 3 dias pré-ajuste, ancorada ao
 * `AjusteCampanha` (não ao dia isolado, não ao mês). Dispara só quando o ROI
 * pós-ajuste vira negativo enquanto o pré-ajuste não era — e só depois que a
 * janela pós-ajuste de 3 dias fecha (nunca fora dela). Item escopado ao
 * ajuste específico (regra embute o `AjusteCampanha.id`).
 */
export async function avaliarRegraRecuo(client: PrismaClient, campanhaId: string, agora: Date = new Date()): Promise<void> {
  const campanha = await client.campanha.findUnique({ where: { id: campanhaId }, select: { id: true, status: true } })
  if (!campanha || campanha.status !== "ESCALANDO") return

  const ultimoAjuste = await client.ajusteCampanha.findFirst({
    where: { campanhaId, tipo: { in: ["BUDGET", "CPA_ALVO"] } },
    orderBy: { data: "desc" },
    select: { id: true, data: true },
  })
  if (!ultimoAjuste) return

  const t = ultimoAjuste.data.getTime()
  const posFimNatural = new Date(t + 3 * 86_400_000)
  if (agora.getTime() < posFimNatural.getTime()) return // janela pós-ajuste ainda não fechou

  const pre = await somaGastoEReceita(client, campanhaId, new Date(t - 3 * 86_400_000), new Date(t))
  const pos = await somaGastoEReceita(client, campanhaId, new Date(t), posFimNatural)
  const roiPre = calcularRoiJanela(pre.gasto, pre.receita).roi
  const roiPos = calcularRoiJanela(pos.gasto, pos.receita).roi

  const virouNegativo = roiPos != null && roiPos < 0 && !(roiPre != null && roiPre < 0)
  if (!virouNegativo) return

  await criarItemFilaComDedup(client, {
    tipoAlvo: "CAMPANHA",
    alvoId: campanhaId,
    regra: `${REGRA_RECUO_PREFIXO}${ultimoAjuste.id}`,
    prioridade: "ALTA",
    resumo: `Recuo: ROI virou negativo nos 3 dias após o ajuste de ${ultimoAjuste.data.toISOString().slice(0, 10)} — desfazer o aumento?`,
    evidencia: { ajusteId: ultimoAjuste.id, roiPre, roiPos },
  })
}
