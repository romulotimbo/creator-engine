import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import {
  ESTRATEGIA_CAMPANHA_LABELS,
  STATUS_OPERACIONAL_LABELS,
  TIPO_BRIDGE_LABELS,
} from "@/lib/afiliados"
import {
  alinharComparativo,
  CORRESPONDENCIA_LABELS,
  serializeIndice,
  TIPO_INDICE_LABELS,
  CHAVE_DISPOSITIVO_LABELS,
  type ChaveDispositivo,
} from "@/lib/afiliados/indices"
import { PageHeader, Surface } from "@/components/ui/primitives"
import { AfiliadosMainNav } from "@/components/afiliados/afiliados-main-nav"

function money(v: number | null) {
  if (v == null) return "—"
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
}

function pct(v: number | null | undefined) {
  if (v == null) return "—"
  return `${v}%`
}

function labelChave(tipo: string, chave: string) {
  if (tipo === "DISPOSITIVO") return CHAVE_DISPOSITIVO_LABELS[chave as ChaveDispositivo] || chave
  return chave
}

export default async function ComparativoProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: produtoId } = await params
  const produto = await db.produtoAfiliado.findUnique({
    where: { id: produtoId },
    select: { id: true, nome: true, slug: true },
  })
  if (!produto) notFound()

  const campanhas = await db.campanha.findMany({
    where: { produtoId },
    include: {
      contaTrafego: { select: { id: true, slug: true, nome: true } },
      indices: { include: { linhas: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  if (campanhas.length === 0) {
    return (
      <div>
        <PageHeader
          kicker="Afiliados"
          title={`Comparativo · ${produto.nome}`}
          description="Este produto ainda não tem campanhas."
        />
        <AfiliadosMainNav />
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          <Link href="/afiliados/produtos" className="ce-link-accent">Voltar ao catálogo</Link>
        </p>
      </div>
    )
  }

  const colunas = campanhas.map((c) => ({
    id: c.id,
    nome: c.nomeCampanhaGoogleAds,
    geo: c.geo,
    estrategia: c.estrategia,
    tipoBridge: c.tipoBridge,
    status: c.status,
    conta: c.contaTrafego?.nome || c.nomeContaAds || "—",
    roiReal: c.roiReal != null ? decimalNum(c.roiReal) : null,
    cpaReal: c.cpaReal != null ? decimalNum(c.cpaReal) : null,
  }))

  const linhas = alinharComparativo(
    campanhas.map((c) => ({
      id: c.id,
      indices: c.indices.map((i) => {
        const s = serializeIndice(i)
        return { tipo: s.tipo, chave: s.chave, correspondencia: s.correspondencia, vigente: s.vigente }
      }),
    })),
  )

  type VigenteCell = {
    status: string
    ajusteLancePct: number
    cpc: number | null
    cliques: number | null
    roi: number | null
  } | null

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title={`Comparativo · ${produto.nome}`}
        description="Vigentes lado a lado. Métricas do índice = acumulado Ads, distintos do ROI/CPA de decisão (venda confirmada)."
      />
      <AfiliadosMainNav />
      <p style={{ fontSize: 12, marginBottom: 12 }}>
        <Link href="/afiliados/produtos" className="ce-link-accent">← Catálogo</Link>
      </p>

      <Surface style={{ padding: "var(--space-md)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr>
              <th style={thSticky}>Índice</th>
              {colunas.map((c) => (
                <th key={c.id} style={th}>
                  <Link href={`/afiliados/campanhas/${c.id}`} style={{ color: "var(--primary)" }}>
                    {c.nome}
                  </Link>
                  <div style={{ fontWeight: 400, color: "var(--muted-foreground)", fontSize: 11, marginTop: 4 }}>
                    {c.geo || "—"} · {c.estrategia ? ESTRATEGIA_CAMPANHA_LABELS[c.estrategia] || c.estrategia : "—"}
                    {" · "}{c.tipoBridge ? TIPO_BRIDGE_LABELS[c.tipoBridge] || c.tipoBridge : "—"}
                    <br />
                    {c.conta} · {STATUS_OPERACIONAL_LABELS[c.status] || c.status}
                    <br />
                    ROI {c.roiReal != null ? `${(c.roiReal * 100).toFixed(1)}%` : "—"}
                    {" · "}CPA {money(c.cpaReal)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((row) => (
              <tr key={`${row.tipo}-${row.chave}-${row.correspondencia ?? ""}`}>
                <td style={tdSticky}>
                  <div style={{ fontWeight: 600 }}>{labelChave(row.tipo, row.chave)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {TIPO_INDICE_LABELS[row.tipo] || row.tipo}
                    {row.correspondencia ? ` · ${CORRESPONDENCIA_LABELS[row.correspondencia] || row.correspondencia}` : ""}
                  </div>
                </td>
                {colunas.map((c) => {
                  const cell = (row.celulas[c.id] ?? null) as VigenteCell
                  return (
                    <td key={c.id} style={td}>
                      {cell ? (
                        <>
                          <div>{pct(cell.ajusteLancePct)} · {cell.status}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            CPC {cell.cpc ?? "—"} · {cell.cliques ?? "—"} cliques
                            {cell.roi != null ? ` · ROI ${cell.roi}` : ""}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--muted-foreground)" }}>—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  verticalAlign: "top",
  borderBottom: "1px solid var(--border)",
  fontWeight: 600,
}
const thSticky: React.CSSProperties = { ...th, position: "sticky", left: 0, background: "var(--card)", minWidth: 160 }
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }
const tdSticky: React.CSSProperties = { ...td, position: "sticky", left: 0, background: "var(--card)" }
