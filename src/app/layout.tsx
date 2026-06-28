import type { Metadata } from "next"
import { Oxanium, Sora, IBM_Plex_Mono } from "next/font/google"
import { getBasePath } from "@/lib/base-path"
import "./globals.css"

const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
})

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Creator Engine",
  description: "Sistema operacional para criacao e gestao de personas digitais",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-base-path={getBasePath()}
      className={`${oxanium.variable} ${sora.variable} ${ibmPlexMono.variable}`}
    >
      <body className="ce-crt-root">{children}</body>
    </html>
  )
}
