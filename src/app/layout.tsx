import type { Metadata } from "next"
import { Syne, Spline_Sans } from "next/font/google"
import "./globals.css"

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
})

const splineSans = Spline_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
})

export const metadata: Metadata = {
  title: "Creator Engine",
  description: "Sistema operacional para criacao e gestao de personas digitais",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${splineSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
