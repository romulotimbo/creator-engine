import { TOTP, Secret } from "otpauth"
import { encrypt, decrypt } from "@/lib/encryption"

export function createTotpSecret(): string {
  return new Secret({ size: 20 }).base32
}

export function verifyTotp(secretBase32: string, token: string): boolean {
  const totp = new TOTP({
    secret: Secret.fromBase32(secretBase32),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  })
  return totp.validate({ token, window: 1 }) !== null
}

export function getOtpAuthUri(email: string, secretBase32: string): string {
  const totp = new TOTP({
    issuer: "Creator Engine",
    label: email,
    secret: Secret.fromBase32(secretBase32),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  })
  return totp.toString()
}

export function encryptTotpSecret(secret: string) {
  return encrypt(secret)
}

export function decryptTotpSecret(enc: string) {
  return decrypt(enc)
}
