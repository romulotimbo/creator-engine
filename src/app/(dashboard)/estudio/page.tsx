import { db } from "@/lib/db"
import { PageHeader } from "@/components/ui/primitives"
import EstudioClient from "./EstudioClient"
import type { Timeline } from "@/lib/estudio/timeline"

export const dynamic = "force-dynamic"

export default async function EstudioPage() {
  const [personas, templates, assets, fontes, roteiros, jobs] = await Promise.all([
    db.persona.findMany({ select: { id: true, slug: true, nomeArtistico: true }, orderBy: { nomeArtistico: "asc" } }),
    db.templateVideo.findMany({ orderBy: { nome: "asc" } }),
    db.assetEstilizacao.findMany({ orderBy: { tag: "asc" } }),
    db.fonteVideo.findMany({
      select: {
        id: true, arquivo: true, nomeOriginal: true, duracaoSeg: true,
        largura: true, altura: true, fps: true, personaId: true, origem: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.roteiroEstilizacao.findMany({ orderBy: { updatedAt: "desc" } }),
    db.jobRender.findMany({
      include: { roteiro: { select: { nome: true } }, templateVideo: { select: { slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  const data = {
    personas,
    templates: templates.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
    assets: assets.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })),
    fontes: fontes.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
    roteiros: roteiros.map((r) => ({
      ...r,
      timeline: (r.timeline as unknown as Timeline) ?? { tracks: [] },
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      formato: j.formato,
      outputPath: j.outputPath,
      erro: j.erro,
      personaId: j.personaId,
      createdAt: j.createdAt.toISOString(),
      roteiro: j.roteiro,
      templateVideo: j.templateVideo,
    })),
  }

  return (
    <div>
      <PageHeader
        kicker="Creator Engine"
        title="Estúdio de Vídeo"
        description="Esteira de estilização: ingira o vídeo bruto, monte o roteiro (texto + animação por tempo) e renderize com a identidade Tactical Rebel."
      />
      <EstudioClient data={data} />
    </div>
  )
}
