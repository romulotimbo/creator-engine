import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { getAuthBasePath, getBasePath } from "@/lib/base-path"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Obrigatório com basePath (/creator-engine): sem isso o client posta em
  // /api/auth/* e o fluxo cai em /api/auth/error (CredentialsSignin).
  basePath: getAuthBasePath(),
  // Atrás de reverse proxy (Traefik no VPS) e em produção, o Auth.js exige
  // confiar no host. Sem isso → UntrustedHost (csrf/session 500).
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.password)
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      const bp = getBasePath()
      // Evita cair em https://romulohub.cloud/ (404 do Traefik) após login.
      if (url.startsWith("/")) {
        const path = bp && !url.startsWith(bp) ? `${bp}${url}` : url
        return `${new URL(baseUrl).origin}${path}`
      }
      if (url.startsWith(baseUrl)) return url
      return bp ? `${new URL(baseUrl).origin}${bp}/` : baseUrl
    },
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
