"use server"

import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"

export type LoginState = { error?: string } | undefined

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
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
