import type { Timeline } from "@/lib/estudio/timeline"
import type { FormatoId } from "../../../../brand/tokens"

export interface PersonaLite {
  id: string
  slug: string
  nomeArtistico: string
}

export interface TemplateLite {
  id: string
  slug: string
  nome: string
  descricao: string | null
  composicao: string
  formatos: FormatoId[]
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface AssetLite {
  id: string
  tag: string
  nome: string
  tipo: string
  arquivo: string
  descricao: string | null
  createdAt: string
  updatedAt: string
}

export interface FonteLite {
  id: string
  arquivo: string
  nomeOriginal: string
  duracaoSeg: number
  largura: number
  altura: number
  fps: number
  personaId: string | null
  origem: string
  createdAt: string
}

export interface RoteiroLite {
  id: string
  nome: string
  formato: FormatoId
  personaId: string | null
  fonteVideoId: string | null
  templateVideoId: string | null
  timeline: Timeline
  createdAt: string
  updatedAt: string
}

export interface JobLite {
  id: string
  status: "FILA" | "RENDERIZANDO" | "POS" | "PRONTO" | "ERRO"
  formato: FormatoId
  outputPath: string | null
  erro: string | null
  personaId: string | null
  createdAt: string
  roteiro: { nome: string } | null
  templateVideo: { slug: string } | null
}

export interface EstudioData {
  personas: PersonaLite[]
  templates: TemplateLite[]
  assets: AssetLite[]
  fontes: FonteLite[]
  roteiros: RoteiroLite[]
  jobs: JobLite[]
}
