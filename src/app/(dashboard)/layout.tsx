import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: 248,
          padding: "var(--space-xl) var(--space-2xl)",
          overflowY: "auto",
          maxWidth: "100%",
        }}
      >
        {children}
      </main>
    </div>
  )
}
