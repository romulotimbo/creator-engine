import type { Ferramenta } from "@prisma/client"

export type FerramentaDTO = {
  id: string
  nome: string
  categoria: string
  urlAcesso: string | null
  versaoAtual: string | null
  statusAssinatura: string
  custoMensal: number | null
  dataRenovacao: string | null
  responsavelConta: string | null
  documentacao: string | null
  configuracaoPadrao?: Record<string, unknown> | null
  tags: string[]
}

/** Converte Ferramenta do Prisma (Decimal em custoMensal) para DTO JSON-safe. */
export function serializeFerramenta(f: Ferramenta): FerramentaDTO {
  return {
    id: f.id,
    nome: f.nome,
    categoria: f.categoria,
    urlAcesso: f.urlAcesso,
    versaoAtual: f.versaoAtual,
    statusAssinatura: f.statusAssinatura,
    custoMensal: f.custoMensal != null ? Number(f.custoMensal) : null,
    dataRenovacao: f.dataRenovacao ? f.dataRenovacao.toISOString() : null,
    responsavelConta: f.responsavelConta,
    documentacao: f.documentacao,
    configuracaoPadrao: (f.configuracaoPadrao as Record<string, unknown> | null) ?? null,
    tags: Array.isArray(f.tags) ? f.tags : [],
  }
}

export function serializeFerramentas(rows: Ferramenta[]): FerramentaDTO[] {
  const out: FerramentaDTO[] = []
  for (const f of rows) {
    try {
      out.push(serializeFerramenta(f))
    } catch {
      // ignora linha corrompida — não derruba a listagem inteira
    }
  }
  return out
}
