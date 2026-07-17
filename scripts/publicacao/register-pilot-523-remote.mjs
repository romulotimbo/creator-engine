#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { PrismaClient } from "@prisma/client"

const SOURCE = "scripts/nano-banana-batch/posts/523-hoje-tambem-teve/512/v1.jpg"
const DATA_DIR = process.env.PUBLICACAO_DATA_DIR ?? "/data/publicacao"
const ORDEM = 523

const db = new PrismaClient()

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Arquivo piloto não encontrado: ${SOURCE}`)
  }

  const persona = await db.persona.findUnique({
    where: { slug: "veesemfiltro" },
    include: { contas: true },
  })
  if (!persona) throw new Error("Persona veesemfiltro não encontrada")

  const instagram = persona.contas.find((c) => c.plataforma === "INSTAGRAM")
  if (!instagram) throw new Error("Conta Instagram não encontrada")

  let post = await db.post.findFirst({
    where: { personaId: persona.id, ordem: ORDEM },
  })

  if (!post) {
    post = await db.post.create({
      data: {
        personaId: persona.id,
        contaId: instagram.id,
        tipo: "REEL",
        pilar: "LIFESTYLE",
        titulo: "hoje também teve",
        status: "AGENDADO",
        dataPublicacao: new Date(),
        ordem: ORDEM,
        publicacaoTipo: "STORY",
      },
    })
    console.log("created_post", post.id)
  } else {
    console.log("existing_post", post.id)
  }

  const token = randomBytes(24).toString("hex")
  const dir = path.join(DATA_DIR, post.id)
  fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(SOURCE, path.join(dir, "v1.jpg"))

  const updated = await db.post.update({
    where: { id: post.id },
    data: {
      contaId: instagram.id,
      status: "AGENDADO",
      dataPublicacao: new Date(),
      publicacaoTipo: "STORY",
      publicacaoStatus: "PRONTA",
      midiaPath: `${post.id}/v1.jpg`,
      midiaMime: "image/jpeg",
      midiaToken: token,
      publicacaoErro: null,
    },
  })

  console.log("postId", updated.id)
  console.log("ordem", updated.ordem)
  console.log("publicacaoStatus", updated.publicacaoStatus)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
