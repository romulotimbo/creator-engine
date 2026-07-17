#!/usr/bin/env node
/**
 * Piloto roteiro 523 — registra mídia e prepara post para fila n8n.
 *
 * Uso:
 *   node scripts/publicacao/register-pilot-523.mjs
 *   PUBLICACAO_DATA_DIR=./tmp/publicacao node scripts/publicacao/register-pilot-523.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { PrismaClient } from "@prisma/client"
import { randomBytes } from "node:crypto"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../..")
const SOURCE = path.join(
  ROOT,
  "scripts/nano-banana-batch/posts/523-hoje-tambem-teve/512/v1.jpg",
)
const ORDEM = 523
const DATA_DIR = process.env.PUBLICACAO_DATA_DIR ?? path.join(ROOT, "tmp/publicacao")

const db = new PrismaClient()

function midiaToken() {
  return randomBytes(24).toString("hex")
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error("Arquivo piloto não encontrado:", SOURCE)
    process.exit(1)
  }

  const persona = await db.persona.findUnique({
    where: { slug: "veesemfiltro" },
    include: { contas: true },
  })
  if (!persona) {
    console.error("Persona veesemfiltro não encontrada — rode npm run db:seed")
    process.exit(1)
  }

  const instagram = persona.contas.find((c) => c.plataforma === "INSTAGRAM")
  if (!instagram) {
    console.error("Conta Instagram @veesemfiltro não encontrada")
    process.exit(1)
  }

  let post = await db.post.findFirst({
    where: { personaId: persona.id, ordem: ORDEM },
  })

  if (!post) {
    console.warn(`Post ordem ${ORDEM} não existe — buscando por título...`)
    post = await db.post.findFirst({
      where: {
        personaId: persona.id,
        titulo: { contains: "hoje também teve", mode: "insensitive" },
      },
    })
  }

  if (!post) {
    console.error(`Post ordem ${ORDEM} não encontrado no banco`)
    process.exit(1)
  }

  const token = midiaToken()
  const postDir = path.join(DATA_DIR, post.id)
  fs.mkdirSync(postDir, { recursive: true })
  const dest = path.join(postDir, "v1.jpg")
  fs.copyFileSync(SOURCE, dest)

  const now = new Date()
  const updated = await db.post.update({
    where: { id: post.id },
    data: {
      contaId: instagram.id,
      status: "AGENDADO",
      dataPublicacao: now,
      publicacaoTipo: "STORY",
      publicacaoStatus: "PRONTA",
      midiaPath: `${post.id}/v1.jpg`,
      midiaMime: "image/jpeg",
      midiaToken: token,
      publicacaoErro: null,
    },
  })

  const base =
    process.env.PUBLICACAO_MEDIA_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000/api/publicacao/media"
  const mediaUrl = `${base}/${updated.id}?token=${token}`

  console.log("Piloto 523 registrado:")
  console.log("  postId:", updated.id)
  console.log("  ordem:", updated.ordem)
  console.log("  titulo:", updated.titulo)
  console.log("  midiaPath:", updated.midiaPath)
  console.log("  mediaUrl:", mediaUrl)
  console.log("")
  console.log("Smoke test:")
  console.log(
    `  curl -H "X-Publish-Token: $N8N_PUBLISH_TOKEN" "http://localhost:3000/api/publicacao/fila?plataforma=INSTAGRAM&limite=1"`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
