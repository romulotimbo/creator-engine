import { inicioHtml } from "@/lib/inicio-html"

export const dynamic = "force-static"

export function GET() {
  return new Response(inicioHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}
