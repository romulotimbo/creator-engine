import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import PerfilClient from "./PerfilClient"

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect("/login")

  return <PerfilClient email={user.email} totpEnabled={user.totpEnabled} />
}
