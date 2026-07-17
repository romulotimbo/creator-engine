import { resolveSessionUser } from "@/lib/authelia"

export type AppSession = {
  user: {
    id: string
    email: string
    name?: string | null
  }
}

/** Sessão derivada dos headers do Authelia (forward auth no Traefik). */
export async function auth(): Promise<AppSession | null> {
  const user = await resolveSessionUser()
  if (!user) return null
  return { user }
}
