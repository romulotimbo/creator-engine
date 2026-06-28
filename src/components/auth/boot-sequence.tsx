"use client"

import { useEffect, useState } from "react"

const BOOT_LINES: { text: string; tone?: "accent" | "cyan" | "success" }[] = [
  { text: "> CREATOR ENGINE v0.1.0" },
  { text: "> INICIANDO SISTEMA...", tone: "accent" },
  { text: "> PersonaForge .............. OK", tone: "success" },
  { text: "> Analytics ................. OK", tone: "success" },
  { text: "> Ferramentas/SOPs .......... OK", tone: "success" },
  { text: "> AGUARDANDO AUTENTICAÇÃO", tone: "cyan" },
]

type BootSequenceProps = {
  onComplete?: () => void
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (visibleCount >= BOOT_LINES.length) {
      const t = setTimeout(() => {
        setDone(true)
        onComplete?.()
      }, 400)
      return () => clearTimeout(t)
    }

    const delay = visibleCount === 0 ? 300 : 180 + Math.random() * 120
    const t = setTimeout(() => setVisibleCount(c => c + 1), delay)
    return () => clearTimeout(t)
  }, [visibleCount, onComplete])

  return (
    <div className="ce-terminal-output" aria-live="polite" aria-label="Sequência de inicialização">
      {BOOT_LINES.slice(0, visibleCount).map((line, i) => (
        <span key={i} className="ce-terminal-line" data-tone={line.tone}>
          {line.text}
        </span>
      ))}
      {!done && visibleCount > 0 && (
        <span className="ce-terminal-line">
          <span className="ce-terminal-cursor" aria-hidden />
        </span>
      )}
    </div>
  )
}

export function useBootReady(fallbackMs = 1200) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), fallbackMs)
    return () => clearTimeout(t)
  }, [fallbackMs])

  return { ready, markReady: () => setReady(true) }
}
