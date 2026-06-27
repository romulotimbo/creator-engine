"use server"

import { signIn } from "@/lib/auth"
import { getBasePath } from "@/lib/base-path"
import { AuthError } from "next-auth"

export type LoginState = { error?: string } | undefined

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    const home = `${getBasePath()}/` || "/"
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: home,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Email ou senha incorretos." }
      }
      return { error: "Não foi possível entrar. Tente novamente." }
    }
    throw error
  }
}
