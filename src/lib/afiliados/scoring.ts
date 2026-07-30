import { CompletudeDados } from "@prisma/client"

export interface OfertaScoringInput {
  epcRede?: number | null
  refundPct?: number | null
  tendenciaTrafego30d?: number | null
  tendenciaTrafego60d?: number | null
  tendenciaTrafego90d?: number | null
  comissaoValor?: number | null
  cpcMedioEsperado?: number | null
  volumeBuscaMensal?: number | null
}

export function calcularCompletudeDados(input: OfertaScoringInput): CompletudeDados {
  const temDadosRede = input.epcRede != null || input.comissaoValor != null
  const temDadosAds = input.cpcMedioEsperado != null || input.volumeBuscaMensal != null

  if (temDadosRede && temDadosAds) {
    return "COMPLETO"
  }
  if (temDadosRede) {
    return "PARCIAL"
  }
  return "INCOMPLETO"
}

export function calcularScoreOferta(input: OfertaScoringInput): {
  scoreCalculado: number
  completudeDados: CompletudeDados
} {
  const completudeDados = calcularCompletudeDados(input)

  const epc = input.epcRede != null ? Number(input.epcRede) : 0
  const refund = input.refundPct != null ? Number(input.refundPct) : 0
  const comissao = input.comissaoValor != null ? Number(input.comissaoValor) : 0
  const t30 = input.tendenciaTrafego30d != null ? Number(input.tendenciaTrafego30d) : 0

  // 1. EPC normalizado (benchmark $5.00 max)
  const epcScore = Math.min(epc / 5.0, 1.0) * 35 // Peso 35

  // 2. Refund score (0 a 100%, 0% refund = 20 pontos)
  const refundScore = Math.max(0, (100 - refund) / 100) * 20 // Peso 20

  // 3. Tendência de tráfego (30d)
  let tendenciaScore = 10 // neutro
  if (t30 > 50) tendenciaScore = 20
  else if (t30 > 0) tendenciaScore = 15
  else if (t30 < -30) tendenciaScore = 2

  // 4. Comissão (benchmark $200.00 max)
  const comissaoScore = Math.min(comissao / 200.0, 1.0) * 15 // Peso 15

  // 5. Bonus/Penalidade de Completude de Dados
  let penalidade = 0
  if (completudeDados === "PARCIAL") penalidade = 5
  if (completudeDados === "INCOMPLETO") penalidade = 20

  const totalRaw = epcScore + refundScore + tendenciaScore + comissaoScore - penalidade
  const scoreCalculado = Math.max(0, Math.min(100, Math.round(totalRaw * 10) / 10))

  return {
    scoreCalculado,
    completudeDados,
  }
}
