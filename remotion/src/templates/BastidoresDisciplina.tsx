import React from "react"
import { Palco } from "./Palco"
import type { CompositionProps } from "../../../src/lib/estudio/timeline"

/**
 * Pilar 2 — Conexão. "Bastidores & Disciplina": rotina/treino, tom acolhedor,
 * legenda em terço inferior, grão sutil e marca d'água @handle. Wrapper fino.
 */
export const BastidoresDisciplina: React.FC<CompositionProps> = (props) => (
  <Palco preset="bastidores" {...props} />
)
