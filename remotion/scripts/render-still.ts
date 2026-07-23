/**
 * Render de still (frame 0) com overlay Tactical Rebel sobre imagem estática.
 * Uso: npm run render:still -- <compositionId> <imagemEntrada> <saida.jpg> [largura] [altura]
 */
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { bundle } from "@remotion/bundler"
import { ensureBrowser, selectComposition, renderStill } from "@remotion/renderer"
import sharp from "sharp"
import { timelineParaProps, type Timeline } from "../../src/lib/estudio/timeline"

const PORT = Number(process.env.ESTUDIO_STATIC_PORT ?? 4599)
const REMOTION_DIR = path.resolve(__dirname, "..")
const ENTRY = path.resolve(REMOTION_DIR, "src/index.ts")
const IN_DIR = path.join(REMOTION_DIR, "in")

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
        res.setHeader(
          "Content-Type",
          CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream"
        )
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

async function stripMetadataJpeg(input: string): Promise<void> {
  try {
    await run("exiftool", ["-all=", "-overwrite_original", input])
  } catch {
    // best-effort
  }
}

export const overlayHojeTambemTeve: Timeline = {
  tracks: [
    {
      tipo: "texto",
      inicio: 0,
      fim: 1,
      conteudo: "hoje também teve 💪",
      estilo: "conviccao",
      animacao: "corte-seco",
      posicao: "safe-baked-text",
    },
  ],
}

async function main() {
  const compositionId = process.argv[2] ?? "overlay-imagem-bastidores"
  const inputImage = path.resolve(process.argv[3] ?? path.join(IN_DIR, "overlay-source.jpg"))
  const outputRel = process.argv[4] ?? "out/overlay-still.jpg"
  const targetW = process.argv[5] ? Number(process.argv[5]) : undefined
  const targetH = process.argv[6] ? Number(process.argv[6]) : undefined

  const output = path.isAbsolute(outputRel) ? outputRel : path.join(REMOTION_DIR, outputRel)
  const tmpPng = `${output}.tmp.png`

  if (!fs.existsSync(inputImage)) {
    throw new Error(`Imagem de entrada não encontrada: ${inputImage}`)
  }

  fs.mkdirSync(IN_DIR, { recursive: true })
  fs.mkdirSync(path.dirname(output), { recursive: true })

  const servedName = "overlay-source.jpg"
  const servedPath = path.join(IN_DIR, servedName)
  fs.copyFileSync(inputImage, servedPath)

  const imagemUrl = `http://localhost:${PORT}/in/${servedName}`
  const props = timelineParaProps(overlayHojeTambemTeve, "VERTICAL_9_16", {
    fonteImagemSrc: imagemUrl,
    overlayImagem: true,
  })
  props.durationInFrames = 1

  console.log(`[render-still] servidor estático :${PORT}`)
  const server = await startStaticServer()

  try {
    console.log("[render-still] browser + bundle…")
    await ensureBrowser()
    const serveUrl = await bundle({ entryPoint: ENTRY })

    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: props as unknown as Record<string, unknown>,
    })

    console.log(`[render-still] renderizando frame 0 → ${tmpPng}`)
    await renderStill({
      composition,
      serveUrl,
      output: tmpPng,
      frame: 0,
      imageFormat: "png",
      inputProps: props as unknown as Record<string, unknown>,
    })

    let pipeline = sharp(tmpPng)
    if (targetW && targetH) {
      pipeline = pipeline.resize(targetW, targetH, { fit: "cover" })
    }
    await pipeline.jpeg({ quality: 92 }).toFile(output)
    fs.rmSync(tmpPng, { force: true })

    console.log("[render-still] strip de metadados (exiftool)…")
    await stripMetadataJpeg(output)
    console.log(`[render-still] PRONTO → ${output}`)
  } finally {
    server.close()
  }
}

main().catch((e) => {
  console.error("[render-still] ERRO:", e)
  process.exit(1)
})
