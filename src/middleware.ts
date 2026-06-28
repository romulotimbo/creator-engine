import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const hits = new Map<string, { count: number; reset: number }>()
const LIMIT = 100
const WINDOW_MS = 60_000

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown"
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const ip = getIp(req)
  const now = Date.now()
  const entry = hits.get(ip)

  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS })
    return NextResponse.next()
  }

  if (entry.count >= LIMIT) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }

  entry.count++
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
