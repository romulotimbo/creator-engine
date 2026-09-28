import { privacidadeHtml } from "@/lib/privacidade-html"

export const dynamic = "force-static"

export function GET() {
  return new Response(privacidadeHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}
