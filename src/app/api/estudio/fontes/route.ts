import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ffprobe, getSubdir, salvarUpload } from "@/lib/estudio/fs-server"
import { isVideoFile } from "@/lib/estudio/paths"
import path from "node:path"

function serialize<T extends { tamanhoBytes: bigint | null }>(f: T) {
  return { ...f, tamanhoBytes: f.tamanhoBytes != null ? Number(f.tamanhoBytes) : null }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get("personaId")

  const fontes = await db.fonteVideo.findMany({
    where: { ...(personaId ? { personaId } : {}) },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(fontes.map(serialize))
}

// Upload direto de vídeo (caminho secundário à ingestão por pasta).
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get("file")
    const personaId = (form.get("personaId") as string) || null
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 })
    }
    if (!isVideoFile(file.name)) {
      return NextResponse.json({ error: "Formato de vídeo não suportado." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const arquivo = salvarUpload("fontes", path.basename(file.name), buffer)
    const dir = getSubdir("fontes")
    const meta = await ffprobe(path.join(dir, arquivo))

    const fonte = await db.fonteVideo.upsert({
      where: { arquivo },
      update: { ...meta, tamanhoBytes: BigInt(meta.tamanhoBytes), personaId, origem: "upload", nomeOriginal: file.name },
      create: {
        arquivo,
        nomeOriginal: file.name,
        personaId,
        origem: "upload",
        duracaoSeg: meta.duracaoSeg,
        largura: meta.largura,
        altura: meta.altura,
        fps: meta.fps,
        tamanhoBytes: BigInt(meta.tamanhoBytes),
      },
    })
    return NextResponse.json(serialize(fonte), { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao enviar."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
