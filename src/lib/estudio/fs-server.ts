/**
 * Operações de filesystem da esteira (SERVER-ONLY — usa Node fs/child_process).
 * Nunca importar em client components.
 */
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { ESTUDIO_SUBDIRS, isVideoFile } from "./paths"

export function getDataDir(): string {
  return process.env.ESTUDIO_DATA_DIR ?? "/data/estudio"
}

export function getSubdir(sub: keyof typeof ESTUDIO_SUBDIRS): string {
  const dir = path.join(getDataDir(), ESTUDIO_SUBDIRS[sub])
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export interface VideoMeta {
  duracaoSeg: number
  largura: number
  altura: number
  fps: number
  tamanhoBytes: number
}

function parseFps(rate: string | undefined): number {
  if (!rate) return 30
  const [n, d] = rate.split("/").map(Number)
  if (!d) return n || 30
  return Math.round((n / d) * 1000) / 1000
}

/** Extrai metadados via ffprobe. Retorna zeros se o ffprobe não estiver disponível. */
export function ffprobe(filePath: string): Promise<VideoMeta> {
  const tamanhoBytes = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
  return new Promise((resolve) => {
    const fallback: VideoMeta = { duracaoSeg: 0, largura: 0, altura: 0, fps: 30, tamanhoBytes }
    const args = ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath]
    const p = spawn("ffprobe", args)
    let out = ""
    p.stdout.on("data", (d) => (out += d))
    p.on("error", () => resolve(fallback))
    p.on("close", (code) => {
      if (code !== 0) return resolve(fallback)
      try {
        const json = JSON.parse(out)
        const v = (json.streams ?? []).find((s: { codec_type?: string }) => s.codec_type === "video")
        resolve({
          duracaoSeg: Math.round((Number(json.format?.duration) || 0) * 100) / 100,
          largura: Number(v?.width) || 0,
          altura: Number(v?.height) || 0,
          fps: parseFps(v?.avg_frame_rate || v?.r_frame_rate),
          tamanhoBytes,
        })
      } catch {
        resolve(fallback)
      }
    })
  })
}

/** Lista arquivos de vídeo no inbox (fontes). */
export function listarInbox(): string[] {
  const dir = getSubdir("fontes")
  return fs.readdirSync(dir).filter((f) => isVideoFile(f))
}

export function salvarUpload(sub: keyof typeof ESTUDIO_SUBDIRS, nomeArquivo: string, dados: Buffer): string {
  const dir = getSubdir(sub)
  const destino = path.join(dir, nomeArquivo)
  fs.writeFileSync(destino, dados)
  return nomeArquivo
}
