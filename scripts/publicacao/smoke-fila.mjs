#!/usr/bin/env node
/**
 * Smoke test local da fila de publicação (requer dev server + piloto registrado).
 *
 * Uso:
 *   N8N_PUBLISH_TOKEN=... node scripts/publicacao/smoke-fila.mjs
 */
const token = process.env.N8N_PUBLISH_TOKEN
const base = process.env.CE_BASE_URL ?? "http://localhost:3000"

if (!token) {
  console.error("Defina N8N_PUBLISH_TOKEN")
  process.exit(1)
}

const filaUrl = `${base}/api/publicacao/fila?plataforma=INSTAGRAM&limite=5`
const res = await fetch(filaUrl, {
  headers: { "X-Publish-Token": token },
})

if (!res.ok) {
  console.error("Fila falhou:", res.status, await res.text())
  process.exit(1)
}

const { items } = await res.json()
console.log("Itens na fila:", items.length)
if (items.length === 0) {
  console.warn("Fila vazia — rode register-pilot-523.mjs primeiro")
  process.exit(0)
}

const first = items[0]
console.log("Primeiro item:", first.postId, first.titulo, first.zernioContentType)

const mediaRes = await fetch(first.mediaUrl, { method: "HEAD" }).catch(() => null)
if (!mediaRes) {
  const getRes = await fetch(first.mediaUrl)
  if (!getRes.ok) {
    console.error("mediaUrl inacessível:", getRes.status)
    process.exit(1)
  }
  console.log("mediaUrl OK (GET)", getRes.headers.get("content-type"))
} else if (!mediaRes.ok) {
  console.error("mediaUrl inacessível:", mediaRes.status)
  process.exit(1)
} else {
  console.log("mediaUrl OK (HEAD)", mediaRes.headers.get("content-type"))
}

const post523 = items.find((i) => i.ordem === 523)
if (post523) {
  console.log("Post 523 na fila:", post523.mediaUrl)
} else {
  console.warn("Post ordem 523 não encontrado na fila (pode estar fora do limite)")
}

console.log("Smoke test OK")
