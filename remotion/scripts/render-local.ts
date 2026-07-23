/**
 * Render local com servidor HTTP para fontes em remotion/in/ (OffthreadVideo exige http(s)).
 * Uso: npm run render:local -- [compositionId] [output.mp4]
 */
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { bundle } from "@remotion/bundler"
import { ensureBrowser, selectComposition, renderMedia } from "@remotion/renderer"
import { timelineParaProps, type Timeline } from "../../src/lib/estudio/timeline"

const PORT = Number(process.env.ESTUDIO_STATIC_PORT ?? 4599)
const REMOTION_DIR = path.resolve(__dirname, "..")
const ENTRY = path.resolve(REMOTION_DIR, "src/index.ts")

const magnificInclinacao: Timeline = {
  handle: "veesemfiltro",
  tracks: [
    { tipo: "texto", inicio: 0, fim: 3.2, conteudo: "O que mais te *atrai*?", estilo: "impacto", animacao: "cascata", posicao: "safe-top" },
    { tipo: "texto", inicio: 3.2, fim: 5.8, conteudo: "Conduzir…", estilo: "conviccao", animacao: "blur-in", posicao: "safe-center" },
    { tipo: "texto", inicio: 5.8, fim: 9.6, conteudo: "ou ser guiado rumo ao *mistério*?", estilo: "conviccao", animacao: "fade", posicao: "safe-bottom" },
  ],
}

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
}

function startStaticServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const rel = decodeURIComponent((req.url ?? "/").split("?")[0])
        const filePath = path.join(REMOTION_DIR, rel)
        if (!filePath.startsWith(REMOTION_DIR) || !fs.existsSync(filePath)) {
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
    server.listen(PORT, () => resolve(server))
  })
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" })
    p.on("error", reject)
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} saiu com código ${code}`))))
  })
}

async function stripMetadata(input: string, output: string): Promise<void> {
  await run("ffmpeg", ["-y", "-i", input, "-map_metadata", "-1", "-c", "copy", output])
  try {
    await run("exiftool", ["-all=", "-overwrite_original", output])
  } catch {
    // FFmpeg já removeu metadados de container; ExifTool é best-effort.
  }
}

async function main() {
  const compositionId = process.argv[2] ?? "magnific-inclinacao-cabeca"
  const outputRel = process.argv[3] ?? "out/magnific-inclinacao-cabeca.mp4"
  const output = path.isAbsolute(outputRel) ? outputRel : path.join(REMOTION_DIR, outputRel)
  const tmp = `${output}.tmp.mp4`

  fs.mkdirSync(path.dirname(output), { recursive: true })

  const fonteUrl = `http://localhost:${PORT}/in/magnific_leve-inclinacao-da-cabeca_vudUUxNa47.mp4`
  const props = timelineParaProps(magnificInclinacao, "VERTICAL_9_16", { fonteVideoSrc: fonteUrl })
  props.durationInFrames = 301

  console.log(`[render-local] servidor estático :${PORT}`)
  const server = await startStaticServer()

  try {
    console.log("[render-local] browser + bundle…")
    await ensureBrowser()
    const serveUrl = await bundle({ entryPoint: ENTRY })

    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: props as unknown as Record<string, unknown>,
    })

    console.log(`[render-local] renderizando ${compositionId} → ${output}`)
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: tmp,
      inputProps: props as unknown as Record<string, unknown>,
    })

    console.log("[render-local] strip de metadados (ffmpeg + exiftool)…")
    await stripMetadata(tmp, output)
    fs.rmSync(tmp, { force: true })
    console.log(`[render-local] PRONTO → ${output}`)
  } finally {
    server.close()
  }
}

main().catch((e) => {
  console.error("[render-local] ERRO:", e)
  process.exit(1)
})
