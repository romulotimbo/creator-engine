import { termosHtml } from "@/lib/termos-html"

export const dynamic = "force-static"

export function GET() {
  return new Response(termosHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}
