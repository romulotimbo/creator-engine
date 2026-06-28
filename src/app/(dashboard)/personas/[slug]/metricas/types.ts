export type SnapshotRow = {
  id: string
  contaId: string
  plataforma: string
  handle: string
  data: string
  seguidores: number
  engajamento: number | null
  receitaDia: number | null
  postsPublicados: number
  delta: number | null
}

export type ContaMetrica = {
  id: string
  plataforma: string
  handle: string
  seguidoresAtual: number
  metaSeguidores: number | null
  delta7d: number | null
}
