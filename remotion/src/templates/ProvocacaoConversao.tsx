import React from "react"
import { Palco } from "./Palco"
import type { CompositionProps } from "../../../src/lib/estudio/timeline"

/**
 * Pilar 3 — Conversão. "Provocação → Conversão": low-key, mistério, vinheta
 * forte + grão, encerrando em CTA (link na bio) com @handle. Wrapper fino.
 */
export const ProvocacaoConversao: React.FC<CompositionProps> = (props) => (
  <Palco preset="provocacao" {...props} />
)
