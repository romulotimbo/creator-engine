"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { tk } from "@/lib/tokens"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger"
  fullWidth?: boolean
}

export function Button({
  variant = "primary",
  fullWidth,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary" ? "ce-btn-primary" : variant === "danger" ? "ce-btn-danger" : "ce-btn-ghost"
  return (
    <button
      type={type}
      className={`ce-btn ${variantClass} ${className}`}
      style={fullWidth ? { width: "100%" } : undefined}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ce-input" {...props} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="ce-input" {...props} />
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="ce-input" {...props}>
      {children}
    </select>
  )
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label className="ce-label" htmlFor={htmlFor}>
      {children}
    </label>
  )
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  glow = false,
}: {
  kicker?: string
  title: string
  description?: string
  actions?: React.ReactNode
  glow?: boolean
}) {
  return (
    <header className="ce-page-header ce-animate-in">
      <div>
        {kicker && <p className="ce-kicker" style={{ marginBottom: "var(--space-sm)" }}>{kicker}</p>}
        <h1
          className={`font-display${glow ? " phosphor-glow" : ""}`}
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: tk.accent,
            marginBottom: description ? "var(--space-xs)" : 0,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ color: tk.muted, fontSize: "var(--text-sm)", maxWidth: "48ch", marginTop: "var(--space-xs)" }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="ce-page-header-actions">{actions}</div>}
    </header>
  )
}

export function PersonaBreadcrumb({ slug, section }: { slug: string; section: string }) {
  return (
    <nav className="ce-persona-crumb" aria-label="Breadcrumb">
      <Link href={`/personas/${slug}`}>@{slug}</Link>
      {" / "}
      <span>{section}</span>
    </nav>
  )
}

export function PersonaPageHeader({
  slug,
  title,
  description,
  actions,
}: {
  slug: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="ce-page-header ce-animate-in">
      <div>
        <PersonaBreadcrumb slug={slug} section={title} />
        <h1
          className="font-display"
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 700,
            color: tk.fg,
            marginBottom: description ? "var(--space-xs)" : 0,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ color: tk.muted, fontSize: "var(--text-sm)", maxWidth: "48ch" }}>{description}</p>
        )}
      </div>
      {actions && <div className="ce-page-header-actions">{actions}</div>}
    </header>
  )
}

export function PersonaSubnav({
  slug,
  links,
  activeHref,
}: {
  slug: string
  links: { href: string; label: string }[]
  activeHref?: string
}) {
  return (
    <nav className="ce-persona-nav" aria-label={`Navegação @${slug}`}>
      {links.map(link => {
        const active = activeHref ? link.href === activeHref : false
        return (
          <Link key={link.href} href={link.href} data-active={active}>
            <button type="button">{link.label}</button>
          </Link>
        )
      })}
    </nav>
  )
}

export function Surface({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`ce-surface ${className}`} style={style}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="ce-section-title">{children}</h2>
}

export function EmptyState({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`ce-empty-state ${className}`}>{children}</div>
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="ce-modal-header">
      <h2>{title}</h2>
      <button type="button" className="ce-modal-close" onClick={onClose} aria-label="Fechar">
        ✕
      </button>
    </div>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  return <p className="ce-error" role="alert">{children}</p>
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="ce-form-actions">{children}</div>
}

export function Field({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  // Com htmlFor explícito mantém <label htmlFor> como irmão; sem ele, envolve o
  // controle num <label> real para associação implícita (a11y + getByLabel).
  if (htmlFor) {
    return (
      <div className={`ce-field ${className}`}>
        <Label htmlFor={htmlFor}>{label}</Label>
        {children}
      </div>
    )
  }
  return (
    <label className={`ce-field ${className}`}>
      <span className="ce-label">{label}</span>
      {children}
    </label>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone,
  children,
}: {
  label: string
  value?: React.ReactNode
  sub?: React.ReactNode
  tone?: "warning" | "default"
  children?: React.ReactNode
}) {
  return (
    <div className="ce-stat-strip" data-tone={tone}>
      <p className="ce-kicker">{label}</p>
      {value != null && <p className="ce-stat-value" style={{ fontSize: "var(--text-xl)" }}>{value}</p>}
      {sub}
      {children}
    </div>
  )
}

/** Modal em portal (document.body) — evita ficar atrás de cards com ce-animate-in. */
export function Modal({
  open,
  onClose,
  children,
  maxWidth = "42rem",
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="ce-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ce-modal-panel"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
