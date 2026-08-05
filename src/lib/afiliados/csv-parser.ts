import { calcularScoreOferta, ScoreBreakdown } from "./scoring"

export interface ParsedCsvOferta {
  nome: string
  plataformas: string[]
  visitasTotais: number | null
  tendenciaTrafego30d: number | null
  tendenciaTrafego60d: number | null
  tendenciaTrafego90d: number | null
  statusTendencia: string | null
  comissaoValor: number | null
  epcRede: number | null
  cvrRede: number | null
  refundPct: number | null
  bounceRate: number | null
  cbGravity: number | null
  cbScore: number | null
  scoreCalculado: number
  scoreBreakdown: ScoreBreakdown
  completudeDados: "COMPLETO" | "PARCIAL" | "INCOMPLETO"
}

function cleanString(val: string | undefined): string {
  if (!val) return ""
  return val
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim()
}

function parseNumber(val: string | undefined): number | null {
  const cleaned = cleanString(val).replace(/\$/g, "").replace(/%/g, "").trim()
  if (!cleaned || cleaned === "" || cleaned === "null" || cleaned === "undefined") {
    return null
  }
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

function parseInteger(val: string | undefined): number | null {
  const num = parseNumber(val)
  return num != null ? Math.round(num) : null
}

function parsePlatforms(val: string | undefined): string[] {
  const cleaned = cleanString(val)
  if (!cleaned) return []
  const items = cleaned.split(",").map((s) => s.trim()).filter(Boolean)
  // Deduplicar plataformas
  return Array.from(new Set(items))
}

export function parseProdutosCsv(csvContent: string): ParsedCsvOferta[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  // Detectar delimitador (; ou ,)
  const headerLine = lines[0]
  const delimiter = headerLine.includes(";") ? ";" : ","

  const headers = headerLine.split(delimiter).map((h) => cleanString(h).toLowerCase())

  const findIndex = (possibleNames: string[]) => {
    return headers.findIndex((h) => possibleNames.includes(h))
  }

  const idxName = findIndex(["name", "nome", "nome_oferta", "oferta"])
  const idxPlatforms = findIndex(["platforms", "plataformas", "rede", "redes"])
  const idxVisits = findIndex(["totalvisits", "visitas_totais", "visitas", "total_visits"])
  const idxT30 = findIndex(["trafficgrowth30", "tendencia_30d", "growth30"])
  const idxT60 = findIndex(["trafficgrowth60", "tendencia_60d", "growth60"])
  const idxT90 = findIndex(["trafficgrowth90", "tendencia_90d", "growth90"])
  const idxCommission = findIndex(["commission", "comissao", "comissão", "commission_value"])
  const idxStatus = findIndex(["status", "status_tendencia"])
  const idxEpc = findIndex(["epc", "epc_rede"])
  const idxCvr = findIndex(["conversionrate", "conversion_rate", "cvr"])
  const idxRefund = findIndex(["refund_rate", "refundrate", "refund"])
  const idxGravity = findIndex(["cb_gravity", "gravity"])
  const idxCbScore = findIndex(["cb_score", "cbscore"])
  const idxBounce = findIndex(["bouncerate", "bounce_rate", "bounce"])

  const results: ParsedCsvOferta[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter)
    if (row.length === 0) continue

    const name = idxName !== -1 ? cleanString(row[idxName]) : ""
    if (!name) continue // pular linhas sem nome

    const plataformas = idxPlatforms !== -1 ? parsePlatforms(row[idxPlatforms]) : []
    const visitasTotais = idxVisits !== -1 ? parseInteger(row[idxVisits]) : null
    const tendenciaTrafego30d = idxT30 !== -1 ? parseNumber(row[idxT30]) : null
    const tendenciaTrafego60d = idxT60 !== -1 ? parseNumber(row[idxT60]) : null
    const tendenciaTrafego90d = idxT90 !== -1 ? parseNumber(row[idxT90]) : null
    const statusTendencia = idxStatus !== -1 ? cleanString(row[idxStatus]) || null : null
    const comissaoValor = idxCommission !== -1 ? parseNumber(row[idxCommission]) : null
    const epcRede = idxEpc !== -1 ? parseNumber(row[idxEpc]) : null
    const cvrRede = idxCvr !== -1 ? parseNumber(row[idxCvr]) : null
    const refundPct = idxRefund !== -1 ? parseNumber(row[idxRefund]) : null
    const bounceRate = idxBounce !== -1 ? parseNumber(row[idxBounce]) : null
    const cbGravity = idxGravity !== -1 ? parseNumber(row[idxGravity]) : null
    const cbScore = idxCbScore !== -1 ? parseNumber(row[idxCbScore]) : null

    const { scoreCalculado, completudeDados, scoreBreakdown } = calcularScoreOferta({
      epcRede,
      refundPct,
      tendenciaTrafego30d,
      tendenciaTrafego60d,
      tendenciaTrafego90d,
      comissaoValor,
    })

    results.push({
      nome: name,
      plataformas,
      visitasTotais,
      tendenciaTrafego30d,
      tendenciaTrafego60d,
      tendenciaTrafego90d,
      statusTendencia,
      comissaoValor,
      epcRede,
      cvrRede,
      refundPct,
      bounceRate,
      cbGravity,
      cbScore,
      scoreCalculado,
      scoreBreakdown,
      completudeDados,
    })
  }

  return results
}
