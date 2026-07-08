import React from "react"
import { Palco } from "./Palco"
import type { CompositionProps } from "../../../src/lib/estudio/timeline"

/**
 * Pilar 1 — Atração. "Gancho da Incongruência": choque nos 3s, cena limpa no
 * miolo, texto de impacto/convicção. Wrapper fino sobre o motor Palco.
 */
export const GanchoIncongruencia: React.FC<CompositionProps> = (props) => (
  <Palco preset="gancho" {...props} />
)
