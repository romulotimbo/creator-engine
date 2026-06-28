import { tk } from "@/lib/tokens"

type Props = {
  sector: string
  title: string
  telemetry: {
    personas: number
    ativas: number
    postsPublicados: number
    postsPendentes: number
  }
}

export function CommandCenterHeader({ sector, title, telemetry }: Props) {
  return (
    <header className="ce-command-header ce-animate-in">
      <div className="ce-command-header-top">
        <p className="ce-kicker">{sector}</p>
        <span className="ce-command-live font-mono">
          <span className="ce-hud-pulse" aria-hidden />
          LIVE FEED
        </span>
      </div>

      <h1 className="font-display phosphor-glow ce-command-title">{title}</h1>

      <div className="ce-command-telemetry font-mono" role="status">
        <span>
          <em>PERSONAS</em> {telemetry.personas}
          <small> ({telemetry.ativas} ativas)</small>
        </span>
        <span className="ce-hud-divider" aria-hidden />
        <span>
          <em>POSTS</em> {telemetry.postsPublicados}
          <small> / {telemetry.postsPendentes} pend.</small>
        </span>
      </div>
    </header>
  )
}

export function CommandSectionHeader({
  code,
  title,
}: {
  code: string
  title: string
}) {
  return (
    <div className="ce-command-section-header">
      <p className="ce-kicker">{code}</p>
      <h2 className="font-display" style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: tk.fg }}>
        {title}
      </h2>
    </div>
  )
}
