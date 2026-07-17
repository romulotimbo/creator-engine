import { redirect } from "next/navigation"

/** Rota legada — login é feito pelo Authelia na borda (Traefik forward auth). */
export default function LoginPage() {
  redirect("/")
}
