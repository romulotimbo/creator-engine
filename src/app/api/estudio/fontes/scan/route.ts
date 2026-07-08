import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ffprobe, getSubdir, listarInbox } from "@/lib/estudio/fs-server"
import path from "node:path"

// Escaneia o diretório de inbox (fontes) e registra vídeos novos como FonteVideo.
// Ignora arquivos inválidos/ilegíveis e não duplica os já registrados.
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dir = getSubdir("fontes")
  const arquivos = listarInbox()
  const existentes = new Set(
    (await db.fonteVideo.findMany({ select: { arquivo: true } })).map((f) => f.arquivo)
  )

  const novos: string[] = []
  const ignorados: string[] = []

  for (const arquivo of arquivos) {
    if (existentes.has(arquivo)) continue
    try {
      const meta = await ffprobe(path.join(dir, arquivo))
      await db.fonteVideo.create({
        data: {
          arquivo,
          nomeOriginal: arquivo,
          origem: "scan",
          duracaoSeg: meta.duracaoSeg,
          largura: meta.largura,
          altura: meta.altura,
          fps: meta.fps,
          tamanhoBytes: BigInt(meta.tamanhoBytes),
        },
      })
      novos.push(arquivo)
    } catch {
      ignorados.push(arquivo)
    }
  }

  return NextResponse.json({ registrados: novos.length, novos, ignorados })
}
