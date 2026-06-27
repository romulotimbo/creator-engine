import { NextRequest } from "next/server"
import { handlers } from "@/lib/auth"
import { getBasePath } from "@/lib/base-path"

// Next.js remove o basePath da URL antes de chegar ao handler; o Auth.js
// precisa do path completo para montar callbacks e redirects corretamente.
function withBasePath(req: NextRequest) {
  const basePath = getBasePath()
  if (!basePath) return req

  const url = new URL(req.url)
  if (url.pathname.startsWith(basePath)) return req

  url.pathname = `${basePath}${url.pathname}`
  return new NextRequest(url, req)
}

export async function GET(req: NextRequest) {
  return handlers.GET(withBasePath(req))
}

export async function POST(req: NextRequest) {
  return handlers.POST(withBasePath(req))
}
