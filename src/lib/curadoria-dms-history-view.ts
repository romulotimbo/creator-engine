import {
  isCuradoriaMessageDirection,
  type CuradoriaDmMessage,
} from "@/lib/curadoria-dms-shared"

export type HistoricoMessagePresentation = {
  incoming: boolean
  alignment: "flex-start" | "flex-end"
  label: "Seguidor" | "Conta"
}

export function getHistoricoMessagePresentation(
  direction: unknown,
): HistoricoMessagePresentation | null {
  if (!isCuradoriaMessageDirection(direction)) return null

  const incoming = direction === "incoming"
  return {
    incoming,
    alignment: incoming ? "flex-start" : "flex-end",
    label: incoming ? "Seguidor" : "Conta",
  }
}

export function filterRenderableHistoricoMessages(
  messages: readonly CuradoriaDmMessage[],
): CuradoriaDmMessage[] {
  return messages.filter(
    (message) => getHistoricoMessagePresentation(message.direction) !== null,
  )
}
