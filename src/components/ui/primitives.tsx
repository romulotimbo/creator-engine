import { tk } from "@/lib/tokens"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost"
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
  return (
    <button
      type={type}
      className={`ce-btn ${variant === "primary" ? "ce-btn-primary" : "ce-btn-ghost"} ${className}`}
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
}: {
  kicker?: string
  title: string
  description?: string
}) {
  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
      {kicker && <p className="ce-kicker" style={{ marginBottom: "var(--space-sm)" }}>{kicker}</p>}
      <h1
        className="font-display"
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: 800,
          color: tk.fg,
          marginBottom: description ? "var(--space-xs)" : 0,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
      {description && (
        <p style={{ color: tk.muted, fontSize: "var(--text-sm)", maxWidth: "42ch" }}>
          {description}
        </p>
      )}
    </header>
  )
}
