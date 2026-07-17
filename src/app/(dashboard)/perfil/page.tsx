import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PerfilClient from "./PerfilClient"

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/acesso-negado")

  return (
    <PerfilClient
      email={session.user.email}
      name={session.user.name ?? null}
      logoutUrl={process.env.AUTHELIA_LOGOUT_URL ?? null}
    />
  )
}
