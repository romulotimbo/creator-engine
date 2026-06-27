import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Creator Engine",
  description: "Sistema operacional para criacao e gestao de personas digitais",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className} style={{ background: "#0a0a0f", color: "#e2e8f0" }}>
        {children}
      </body>
    </html>
  )
}
