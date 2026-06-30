"use client"
import { useEffect, useMemo, useState } from "react"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, isSameDay, isSameMonth, format,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { apiUrl } from "@/lib/api-url"
import { Button } from "@/components/ui/primitives"

type Post = {
  id: string; titulo: string; tipo: string; status: string
  dataPublicacao: string | Date | null
}

const STATUS_COLOR: Record<string, string> = {
  PENDENTE: "var(--faint)",
  APROVADO: "var(--cyan)",
  AGENDADO: "var(--accent)",
  PUBLICADO: "var(--success)",
  REJEITADO: "var(--danger)",
}
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

function dateOf(p: Post): Date | null {
  return p.dataPublicacao ? new Date(p.dataPublicacao) : null
}

function chipColors(status: string) {
  const color = STATUS_COLOR[status] || "var(--faint)"
  return {
    dot: color,
    background: `color-mix(in oklch, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
  }
}

function useNarrowViewport(maxWidth = 900) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [maxWidth])
  return narrow
}

export default function CalendarioClient({ initialPosts }: { initialPosts: Post[] }) {
  const narrow = useNarrowViewport()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()))
  const [dragId, setDragId] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const unscheduled = posts.filter((p) => !p.dataPublicacao)
  const postsByDay = useMemo(() => {
    const m: Record<string, Post[]> = {}
    for (const p of posts) {
      const d = dateOf(p)
      if (!d) continue
      const k = format(d, "yyyy-MM-dd")
      ;(m[k] ||= []).push(p)
    }
    return m
  }, [posts])

  async function reschedule(id: string, day: Date | null) {
    const post = posts.find((p) => p.id === id)
    if (!post) return
    let novaData: Date | null = null
    if (day) {
      const prev = dateOf(post)
      novaData = new Date(day.getFullYear(), day.getMonth(), day.getDate(), prev?.getHours() ?? 12, prev?.getMinutes() ?? 0)
    }
    const prevState = posts
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, dataPublicacao: novaData } : p)))
    setBusy(true)
    try {
      const res = await fetch(apiUrl(`/api/posts/${id}`), {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataPublicacao: novaData ? novaData.toISOString() : null }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setPosts(prevState)
      alert("Falha ao reagendar.")
    } finally {
      setBusy(false)
    }
  }

  function onDropDay(day: Date, e: React.DragEvent) {
    e.preventDefault()
    setOverKey(null)
    if (dragId) reschedule(dragId, day)
    setDragId(null)
  }

  function chip(p: Post, draggable = true) {
    const colors = chipColors(p.status)
    return (
      <div
        key={p.id}
        data-testid={`calendario-chip-${p.id}`}
        draggable={draggable && !busy}
        onDragStart={() => setDragId(p.id)}
        onDragEnd={() => { setDragId(null); setOverKey(null) }}
        title={p.titulo}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "3px 6px", marginBottom: 4,
          background: colors.background, border: colors.border, borderRadius: 5,
          fontSize: 11, color: "var(--foreground)", cursor: "grab", whiteSpace: "nowrap", overflow: "hidden",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 6, background: colors.dot, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.titulo}</span>
      </div>
    )
  }

  const trayOver = overKey === "tray"

  return (
    <div
      data-testid="calendario-persona-layout"
      style={{
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "1fr 260px",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div data-testid="calendario-grid">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", textTransform: "capitalize" }}>
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="ce-page-header-actions" style={{ marginBottom: 0 }}>
            <Button variant="ghost" onClick={() => setCursor((c) => addMonths(c, -1))} style={{ padding: "6px 12px" }}>←</Button>
            <Button variant="ghost" onClick={() => setCursor(startOfMonth(new Date()))} style={{ padding: "6px 12px" }}>Hoje</Button>
            <Button variant="ghost" onClick={() => setCursor((c) => addMonths(c, 1))} style={{ padding: "6px 12px" }}>→</Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: "center", color: "var(--faint)", fontSize: 12, fontWeight: 600, padding: "4px 0" }}>{d}</div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayPosts = postsByDay[key] || []
            const inMonth = isSameMonth(day, cursor)
            const today = isSameDay(day, new Date())
            const over = overKey === key
            return (
              <div
                key={key}
                data-testid={`calendario-day-${key}`}
                onDragOver={(e) => { e.preventDefault(); setOverKey(key) }}
                onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
                onDrop={(e) => onDropDay(day, e)}
                style={{
                  minHeight: 96, padding: 6, borderRadius: 8,
                  background: over ? "color-mix(in oklch, var(--accent) 12%, var(--surface))" : inMonth ? "var(--surface)" : "var(--background)",
                  border: `1px solid ${over ? "var(--accent)" : today ? "var(--accent)" : "var(--border)"}`,
                  opacity: inMonth ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 12, color: today ? "var(--accent)" : "var(--faint)", fontWeight: today ? 700 : 400, marginBottom: 4 }}>
                  {format(day, "d")}
                </div>
                {dayPosts.slice(0, 4).map((p) => chip(p))}
                {dayPosts.length > 4 && <div style={{ fontSize: 10, color: "var(--faint)" }}>+{dayPosts.length - 4} mais</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div
        data-testid="calendario-tray"
        onDragOver={(e) => { e.preventDefault(); setOverKey("tray") }}
        onDragLeave={() => setOverKey((k) => (k === "tray" ? null : k))}
        onDrop={(e) => { e.preventDefault(); setOverKey(null); if (dragId) reschedule(dragId, null); setDragId(null) }}
        style={{
          background: trayOver ? "color-mix(in oklch, var(--accent) 12%, var(--surface))" : "var(--surface)",
          border: `1px solid ${trayOver ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 12,
          padding: 12,
          position: narrow ? "static" : "sticky",
          top: narrow ? undefined : 16,
          maxHeight: narrow ? undefined : "calc(100vh - 120px)",
          overflowY: "auto",
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Sem data ({unscheduled.length})</p>
        <p style={{ fontSize: 11, color: "var(--faint)", marginBottom: 10 }}>Arraste para um dia para agendar. Solte aqui para remover a data.</p>
        {unscheduled.slice(0, 200).map((p) => chip(p))}
        {unscheduled.length > 200 && <p style={{ fontSize: 11, color: "var(--faint)" }}>+{unscheduled.length - 200} ocultos</p>}
        {unscheduled.length === 0 && <p style={{ fontSize: 12, color: "var(--faint)" }}>Tudo agendado 🎉</p>}
      </div>
    </div>
  )
}
