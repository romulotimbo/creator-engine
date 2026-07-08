/**
 * Worker de render (container creator-engine-render).
 * Fila = tabela JobRender no Postgres. Faz polling com FOR UPDATE SKIP LOCKED,
 * renderiza via Remotion (@remotion/renderer), aplica strip de metadados (FFmpeg
 * + ExifTool) e grava o output no volume compartilhado.
 *
 * Sem broker externo — alinhado ao "1 database, vários schemas".
 */
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { PrismaClient } from "@prisma/client"
import { bundle } from "@remotion/bundler"
import { ensureBrowser, selectComposition, renderMedia } from "@remotion/renderer"
import { timelineParaProps, type Timeline, type CompositionProps } from "../../../src/lib/estudio/timeline"
import { ESTUDIO_SUBDIRS, nomeOutput } from "../../../src/lib/estudio/paths"
import type { FormatoId } from "../../../brand/tokens"

const DATA_DIR = process.env.ESTUDIO_DATA_DIR ?? "/data/estudio"
const STATIC_PORT = Number(process.env.ESTUDIO_STATIC_PORT ?? 4599)
const POLL_MS = Number(process.env.ESTUDIO_POLL_MS ?? 4000)
const ENTRY = path.resolve(__dirname, "../index.ts")

const prisma = new PrismaClient()

// ─── servidor estático: expõe DATA_DIR ao Chromium headless ──────────────────
const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
}

function startStaticServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const rel = decodeURIComponent((req.url ?? "/").split("?")[0])
        const filePath = path.join(DATA_DIR, rel)
        if (!filePath.startsWith(DATA_DIR) || !fs.existsSync(filePath)) {
          res.statusCode = 404
          return res.end("not found")
        }
        res.setHeader("Content-Type", CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream")
        fs.createReadStream(filePath).pipe(res)
      } catch {
        res.statusCode = 500
        res.end("error")
      }
    })
    server.listen(STATIC_PORT, () => resolve(server))
  })
}

function assetUrl(sub: string, arquivo: string): string {
  return `http://localhost:${STATIC_PORT}/${sub}/${encodeURIComponent(arquivo)}`
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "ignore" })
    p.on("error", reject)
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} saiu com código ${code}`))))
  })
}

/** Strip de metadados: FFmpeg remux + ExifTool (best-effort, não falha o job). */
async function stripMetadata(input: string, output: string): Promise<void> {
  await run("ffmpeg", ["-y", "-i", input, "-map_metadata", "-1", "-c", "copy", output])
  try {
    await run("exiftool", ["-all=", "-overwrite_original", output])
  } catch {
    // ExifTool é opcional; o FFmpeg já removeu os metadados de container.
  }
}

/** Claim atômico de 1 job (FOR UPDATE SKIP LOCKED). */
async function claimJob(): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `UPDATE "JobRender"
     SET status='RENDERIZANDO', "iniciadoEm"=now(), "updatedAt"=now(), tentativas=tentativas+1
     WHERE id = (
       SELECT id FROM "JobRender"
       WHERE status='FILA'
       ORDER BY "createdAt" ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING id;`
  )
  return rows[0]?.id ?? null
}

function nextVersion(dir: string, template: string, formato: string): string {
  let versao = 1
  let nome = nomeOutput(template, formato, new Date(), versao)
  while (fs.existsSync(path.join(dir, nome))) {
    versao += 1
    nome = nomeOutput(template, formato, new Date(), versao)
  }
  return nome
}

async function processJob(jobId: string, serveUrl: string): Promise<void> {
  const job = await prisma.jobRender.findUnique({
    where: { id: jobId },
    include: { roteiro: true, fonteVideo: true, templateVideo: true },
  })
  if (!job) return

  const timeline = job.roteiro.timeline as unknown as Timeline
  const formato = job.formato as FormatoId
  const fonteSrc = job.fonteVideo ? assetUrl(ESTUDIO_SUBDIRS.fontes, job.fonteVideo.arquivo) : undefined

  // resolve tags de asset → URLs
  const tags = timeline.tracks.filter((t) => t.tipo === "asset").map((t) => t.assetTag!).filter(Boolean)
  const assetsDb = tags.length ? await prisma.assetEstilizacao.findMany({ where: { tag: { in: tags } } }) : []
  const assets: Record<string, string> = {}
  for (const a of assetsDb) assets[a.tag] = assetUrl(ESTUDIO_SUBDIRS.assets, a.arquivo)

  const props: CompositionProps = timelineParaProps(timeline, formato, { fonteVideoSrc: fonteSrc, assets })
  if (job.fonteVideo && job.fonteVideo.duracaoSeg > 0) {
    props.durationInFrames = Math.max(props.durationInFrames, Math.round(job.fonteVideo.duracaoSeg * props.fps))
  }

  const composition = await selectComposition({
    serveUrl,
    id: job.templateVideo?.composicao || "gancho-incongruencia",
    inputProps: props as unknown as Record<string, unknown>,
  })

  const outputDir = path.join(DATA_DIR, ESTUDIO_SUBDIRS.output)
  fs.mkdirSync(outputDir, { recursive: true })
  const tmp = path.join(outputDir, `tmp_${jobId}.mp4`)

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: tmp,
    inputProps: props as unknown as Record<string, unknown>,
  })

  const templateSlug = job.templateVideo?.slug ?? "gancho-incongruencia"
  const nomeFinal = nextVersion(outputDir, templateSlug, formato)
  const finalPath = path.join(outputDir, nomeFinal)
  await stripMetadata(tmp, finalPath)
  fs.rmSync(tmp, { force: true })

  await prisma.jobRender.update({
    where: { id: jobId },
    data: {
      status: "PRONTO",
      outputPath: `${ESTUDIO_SUBDIRS.output}/${nomeFinal}`,
      concluidoEm: new Date(),
      metadados: { width: props.width, height: props.height, fps: props.fps, durationInFrames: props.durationInFrames },
    },
  })
  console.log(`[render] job ${jobId} PRONTO → ${nomeFinal}`)
}

async function main() {
  console.log(`[render] worker iniciando — DATA_DIR=${DATA_DIR}`)
  await ensureBrowser()
  await startStaticServer()
  console.log(`[render] servidor estático em :${STATIC_PORT}`)
  const serveUrl = await bundle({ entryPoint: ENTRY })
  console.log(`[render] bundle Remotion pronto`)

  // loop de polling
  for (;;) {
    let jobId: string | null = null
    try {
      jobId = await claimJob()
    } catch (e) {
      console.error("[render] erro ao reservar job:", e)
    }
    if (!jobId) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      continue
    }
    try {
      await processJob(jobId, serveUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[render] job ${jobId} ERRO:`, msg)
      await prisma.jobRender.update({
        where: { id: jobId },
        data: { status: "ERRO", erro: msg, concluidoEm: new Date() },
      }).catch(() => {})
    }
  }
}

main().catch((e) => {
  console.error("[render] fatal:", e)
  process.exit(1)
})
