import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import MetricasClient from "./MetricasClient"
import { PLATAFORMA_LABELS } from "@/lib/utils"
import type { ContaMetrica, SnapshotRow } from "./types"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"
import { EmptyState } from "@/components/ui/primitives"

function computeDeltas(
  metricas: { id: string; contaId: string; data: Date; seguidores: number; engajamento: unknown; receitaDia: unknown; postsPublicados: number }[],
  platByConta: Record<string, { plataforma: string; handle: string }>,
): SnapshotRow[] {
  const byConta: Record<string, typeof metricas> = {}
  for (const m of metricas) {
    byConta[m.contaId] ||= []
    byConta[m.contaId].push(m)
  }

  const rows: SnapshotRow[] = []
  for (const contaId of Object.keys(byConta)) {
    const sorted = [...byConta[contaId]].sort((a, b) => a.data.getTime() - b.data.getTime())
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]
      const prev = i > 0 ? sorted[i - 1] : null
      const info = platByConta[contaId]
      rows.push({
        id: m.id,
        contaId,
        plataforma: info.plataforma,
        handle: info.handle,
        data: format(m.data, "yyyy-MM-dd"),
        seguidores: m.seguidores,
        engajamento: m.engajamento != null ? Number(m.engajamento) : null,
        receitaDia: m.receitaDia != null ? Number(m.receitaDia) : null,
        postsPublicados: m.postsPublicados,
        delta: prev ? m.seguidores - prev.seguidores : null,
      })
    }
  }

  return rows.sort((a, b) => b.data.localeCompare(a.data) || a.plataforma.localeCompare(b.plataforma))
}

function delta7d(metricas: { data: Date; seguidores: number }[]): number | null {
  if (metricas.length < 2) return null
  const sorted = [...metricas].sort((a, b) => a.data.getTime() - b.data.getTime())
  const latest = sorted[sorted.length - 1]
  const cutoff = new Date(latest.data)
  cutoff.setUTCDate(cutoff.getUTCDate() - 7)

  let refIdx = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].data.getTime() <= cutoff.getTime()) refIdx = i
  }
  const ref = sorted[refIdx]
  if (ref === latest) return null
  return latest.seguidores - ref.seguidores
}

export default async function MetricasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({
    where: { slug },
    include: { contas: true },
  })
  if (!persona) notFound()

  const metricas = await db.metricaHistorica.findMany({
    where: { contaId: { in: persona.contas.map((c) => c.id) } },
    orderBy: { data: "asc" },
  })

  const platByConta = Object.fromEntries(
    persona.contas.map((c) => [c.id, { plataforma: c.plataforma, handle: c.handle }]),
  )

  const snapshots = computeDeltas(metricas, platByConta)

  const metricasByConta: Record<string, typeof metricas> = {}
  for (const m of metricas) {
    metricasByConta[m.contaId] ||= []
    metricasByConta[m.contaId].push(m)
  }

  const contas: ContaMetrica[] = persona.contas.map((c) => ({
    id: c.id,
    plataforma: c.plataforma,
    handle: c.handle,
    seguidoresAtual: c.seguidoresAtual,
    metaSeguidores: c.metaSeguidores,
    delta7d: delta7d(metricasByConta[c.id] ?? []),
  }))

  const plataformas = [...new Set(persona.contas.map((c) => c.plataforma))]

  return (
    <div>
      <PersonaSectionHeader
        slug={slug}
        title="Métricas"
        activeSegment="metricas"
        description="Registre snapshots de seguidores e acompanhe o histórico por conta"
      />

      {persona.contas.length === 0 ? (
        <EmptyState>
          <p style={{ marginBottom: "var(--space-md)" }}>Nenhuma conta cadastrada para esta persona.</p>
          <Link href={`/personas/${slug}`} className="ce-link-accent">Voltar ao hub</Link>
        </EmptyState>
      ) : (
        <MetricasClient
          contas={contas}
          snapshots={snapshots}
          plataformas={plataformas}
          plataformaLabels={PLATAFORMA_LABELS}
        />
      )}
    </div>
  )
}
