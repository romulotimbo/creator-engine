import { Prisma, TermsVersion } from "@prisma/client"

export interface TermsVerificationInput {
  hasChanged: boolean
  termsUrl?: string | null
  changesSummary?: string | null
  capturedBy?: string | null
}

/**
 * Registro de verificação de termos (terms-versioning).
 *
 * `termsVerifiedAt` é sempre atualizado, independente de ter havido mudança.
 * `TermsVersion` é append-only — só é criado quando `hasChanged` é `true`,
 * e nunca é atualizado/deletado depois de criado.
 */
export async function recordTermsVerification(
  tx: Prisma.TransactionClient,
  ofertaId: string,
  input: TermsVerificationInput,
): Promise<{ termsVerifiedAt: Date; termsVersion: TermsVersion | null }> {
  const now = new Date()

  await tx.ofertaDecisao.update({
    where: { id: ofertaId },
    data: { termsVerifiedAt: now },
  })

  if (!input.hasChanged) {
    return { termsVerifiedAt: now, termsVersion: null }
  }

  const termsVersion = await tx.termsVersion.create({
    data: {
      ofertaId,
      verifiedAt: now,
      termsUrl: input.termsUrl ?? null,
      changesSummary: input.changesSummary ?? null,
      capturedBy: input.capturedBy ?? null,
    },
  })

  return { termsVerifiedAt: now, termsVersion }
}
