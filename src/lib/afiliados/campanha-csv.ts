function cleanString(val: string | undefined): string {
  if (!val) return ""
  return val
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim()
}

function parseNumber(val: string | undefined): number | null {
  const cleaned = cleanString(val).replace(/\$/g, "").replace(/%/g, "").replace(/,/g, "").trim()
  if (!cleaned || cleaned === "null" || cleaned === "undefined") return null
  const parsed = parseFloat(cleaned)
  return Number.isNaN(parsed) ? null : parsed
}

function parseInteger(val: string | undefined): number | null {
  const num = parseNumber(val)
  return num != null ? Math.round(num) : null
}

export function normalizeCampaignName(name: string): string {
  return name.trim().toLowerCase()
}

export type ParsedCampanhaCsvRow = {
  nomeCampanhaGoogleAds: string
  gasto: number | null
  impressoes: number | null
  cliques: number | null
  ctr: number | null
  conversoes: number | null
  cvr: number | null
  cpcMedio: number | null
  cpaReal: number | null
  receitaConfirmada: number | null
  roiReal: number | null
  invalidReason?: string
}

const HEADER_ALIASES: Record<string, keyof Omit<ParsedCampanhaCsvRow, "invalidReason">> = {
  campaign: "nomeCampanhaGoogleAds",
  "campaign name": "nomeCampanhaGoogleAds",
  campanha: "nomeCampanhaGoogleAds",
  "nome da campanha": "nomeCampanhaGoogleAds",
  nomecampanhagoogleads: "nomeCampanhaGoogleAds",
  cost: "gasto",
  spend: "gasto",
  gasto: "gasto",
  impressions: "impressoes",
  impressoes: "impressoes",
  clicks: "cliques",
  cliques: "cliques",
  ctr: "ctr",
  conversions: "conversoes",
  conversoes: "conversoes",
  conv: "conversoes",
  cvr: "cvr",
  "avg. cpc": "cpcMedio",
  "avg cpc": "cpcMedio",
  cpc: "cpcMedio",
  cpa: "cpaReal",
  "cost / conv.": "cpaReal",
  convvalue: "receitaConfirmada",
  "conv. value": "receitaConfirmada",
  "conversion value": "receitaConfirmada",
  receita: "receitaConfirmada",
  "receita confirmada": "receitaConfirmada",
  roi: "roiReal",
}

function mapHeader(h: string): keyof Omit<ParsedCampanhaCsvRow, "invalidReason"> | null {
  const key = cleanString(h).toLowerCase()
  return HEADER_ALIASES[key] ?? null
}

export function parseCampanhaPerformanceCsv(csvText: string): ParsedCampanhaCsvRow[] {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => mapHeader(h))
  const nameIdx = headers.findIndex((h) => h === "nomeCampanhaGoogleAds")

  const rows: ParsedCampanhaCsvRow[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(",")
    const nome = nameIdx >= 0 ? cleanString(cols[nameIdx]) : ""
    if (!nome) {
      rows.push({
        nomeCampanhaGoogleAds: "",
        gasto: null,
        impressoes: null,
        cliques: null,
        ctr: null,
        conversoes: null,
        cvr: null,
        cpcMedio: null,
        cpaReal: null,
        receitaConfirmada: null,
        roiReal: null,
        invalidReason: "Linha sem nome de campanha",
      })
      continue
    }

    const row: ParsedCampanhaCsvRow = {
      nomeCampanhaGoogleAds: nome,
      gasto: null,
      impressoes: null,
      cliques: null,
      ctr: null,
      conversoes: null,
      cvr: null,
      cpcMedio: null,
      cpaReal: null,
      receitaConfirmada: null,
      roiReal: null,
    }

    headers.forEach((field, i) => {
      if (!field || field === "nomeCampanhaGoogleAds") return
      const raw = cols[i]
      if (field === "impressoes" || field === "cliques") {
        row[field] = parseInteger(raw)
      } else {
        row[field] = parseNumber(raw)
      }
    })
    rows.push(row)
  }

  return rows
}
