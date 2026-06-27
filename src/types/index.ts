import type {
  Persona,
  ContaPlataforma,
  Post,
  Receita,
  Custo,
  DiscoveryEntry,
  PersonaStatus,
  Plataforma,
  StatusPost,
  TipoPost,
  PilarConteudo,
} from "@prisma/client"

export type {
  Persona,
  ContaPlataforma,
  Post,
  Receita,
  Custo,
  DiscoveryEntry,
  PersonaStatus,
  Plataforma,
  StatusPost,
  TipoPost,
  PilarConteudo,
}

export type PersonaWithContas = Persona & {
  contas: ContaPlataforma[]
  _count?: {
    posts: number
    receitas?: number
  }
}

export type PersonaWithFinanceiro = Persona & {
  contas: ContaPlataforma[]
  receitas: Receita[]
  custos: Custo[]
}

export type PostWithPersona = Post & {
  persona: Pick<Persona, "id" | "slug" | "nomeArtistico">
  conta?: ContaPlataforma | null
}

export type DashboardStats = {
  totalPersonas: number
  personasAtivas: number
  totalSeguidoresIG: number
  totalSeguidoresTT: number
  receitaTotal: number
  custoTotal: number
  lucroTotal: number
  postsPublicados: number
  postsPendentes: number
}
