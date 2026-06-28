import Link from "next/link"
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
}: {
  kicker?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="ce-page-header ce-animate-in">
      <div>
        {kicker && <p className="ce-kicker" style={{ marginBottom: "var(--space-sm)" }}>{kicker}</p>}
        <h1
          className="font-display phosphor-glow"
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
