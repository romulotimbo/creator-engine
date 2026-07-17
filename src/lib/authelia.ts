import { headers } from "next/headers"
import { db } from "@/lib/db"

const HEADER_KEYS = {
  email: ["remote-email", "x-remote-email"],
  user: ["remote-user", "x-remote-user"],
  name: ["remote-name", "x-remote-name"],
} as const

function readHeader(h: Headers, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = h.get(key)?.trim()
    if (value) return value
  }
  return null
}

function normalizeEmail(rawEmail: string | null, rawUser: string | null): string | null {
  const candidate = rawEmail ?? rawUser
  if (!candidate) return null
  if (candidate.includes("@")) return candidate.toLowerCase()

  const domain = process.env.AUTH_EMAIL_DOMAIN?.trim()
  if (!domain) return null
  return `${candidate.toLowerCase()}@${domain.toLowerCase()}`
}

export type SessionUser = {
  id: string
  email: string
  name: string | null
}

/** Resolve o usuário autenticado via Authelia (prod) ou AUTH_DEV_EMAIL (dev). */
export async function resolveSessionUser(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_EMAIL) {
    return ensureUser(process.env.AUTH_DEV_EMAIL.trim(), "Dev")
  }

  const h = await headers()
  const email = normalizeEmail(
    readHeader(h, HEADER_KEYS.email),
    readHeader(h, HEADER_KEYS.user),
  )
  if (!email) return null

  const name = readHeader(h, HEADER_KEYS.name)
  return ensureUser(email, name)
}

async function ensureUser(email: string, name: string | null): Promise<SessionUser> {
  const user = await db.user.upsert({
    where: { email },
    update: name ? { name } : {},
    create: { email, name },
  })
  return { id: user.id, email: user.email, name: user.name }
}
