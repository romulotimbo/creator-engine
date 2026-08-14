## Context

O Creator Engine (Next.js 16 + Prisma 6 + Postgres `creator_engine`) já cobre **Personas** (identidade + redes + conteúdo) e **Ferramentas** (infra compartilhada + credenciais globais). Monetização afiliada aparece só como anexo frágil: `FunilMonetizacao` 1:1 com persona e um único `linkAfiliado`/`plataformaAfil`.

Na operação real (ex.: Power Energi × Braip), o hub do dia a dia é a **conta de anúncios/tráfego**: nela o operador concentra produtos de várias plataformas afiliadas, contas auxiliares (Braip, e-mail, proxy, pixel) e o P&L de mídia/comissões — muitas vezes **sem** persona de rede social.

Personas e Ferramentas permanecem; esta change adiciona um eixo paralelo **Afiliados**, com ContaTrafego como agregador contextual.

## Goals / Non-Goals

**Goals:**
- Hub operacional por ContaTrafego (lista → detalhe por slug), espelhando o *padrão UX* de Personas sem clonar domínio de conteúdo.
- Contas vinculadas por ContaTrafego (CRUD), análogo a `ContaPlataforma`.
- Catálogo de ProdutoAfiliado multiplataforma, associável a N ContaTrafego (mesmo produto em contas distintas para testar estratégia/mercado).
- Credenciais com três escopos mutuamente exclusivos: persona | ContaTrafego | global (Ferramentas).
- Registro manual de vendas/comissões por ContaTrafego (± produto), com resumo no hub.
- SQL idempotente + UI/API no padrão existente (Server Components, Zod, tema dark, `basePath`).

**Non-Goals:**
- Clone estrutural de Personas (posts, calendário, métricas de seguidores, status SHADOW_BAN).
- Webhooks Braip / n8n / automação de comissão (apenas gancho mental: campos manuais + `origem=MANUAL` para evolução futura).
- Migrar ou deprecar `FunilMonetizacao` de persona nesta change.
- Conta de anúncios como “perfil” genérico sem tipagem de tráfego.
- Marketplace multi-tenant / permissões por usuário além do auth atual.

## Decisions

### D1 — Hub = ContaTrafego (não Produto, não “Perfil” clone)

A entidade raiz do módulo é `ContaTrafego` (slug único, nome, plataforma de ads, status, observações, meta opcional de gasto/ROAS). Produtos e contas auxiliares pendem dela.

```
ContaTrafego (hub)                    Persona (intacto)
├── ContaVinculada[]                  ├── ContaPlataforma[]
├── ProdutoAfiliado[] (N:N)           ├── Post / Funil / …
├── Credencial[] (escopo)             ├── Credencial[] (escopo)
└── VendaAfiliado[]                   └── Receita[]
```

- *Alternativas rejeitadas:* (A) produto no centro — fragmenta o dia a dia de ads; (B) clone Persona→Perfil — bagagem social e campos errados; (C) forçar afiliado só via Funil de persona — exige persona fantasma.

### D2 — Contas vinculadas tipadas (não enum Plataforma social)

`ContaVinculadaTrafego` com `tipo` string/enum próprio do módulo (`BRAIP`, `MONETIZZE`, `HOTMART`, `EMAIL`, `PROXY`, `PIXEL`, `OUTRO`), handle/identificador, status, notas. Unicidade por `(contaTrafegoId, tipo, handle)` ou `(contaTrafegoId, tipo)` quando fizer sentido (ex.: um pixel por conta).

- *Rationale:* Braip não é Instagram; reusar `Plataforma` misturaria analytics de seguidores com afiliado.

### D3 — ProdutoAfiliado como catálogo + junção N:N

`ProdutoAfiliado` guarda oferta (nome, slug, plataforma afiliada, preço, % comissão, link checkout/LP, status). Tabela de junção `ContaTrafegoProduto` permite o mesmo produto em várias ContaTrafego (cenário raro mas válido para A/B de mercado/estratégia). Campos específicos do vínculo (ex.: link de tracking daquela conta, ativo na conta) ficam na junção.

- *Alternativa:* produto “filho” exclusivo de uma ContaTrafego — mais simples, mas impede o caso de teste multi-conta que o operador quer.

### D4 — Vendas/comissões em model próprio (não estender Receita.personaId)

`VendaAfiliado`: data, valor venda, valor comissão, plataforma afiliada, status (`PENDENTE`|`APROVADA`|`CANCELADA`|`ESTORNADA`), `produtoId` opcional, `contaTrafegoId` obrigatório, `origem` default `MANUAL`, `externalId` nullable (gancho futuro webhook), observações.

`Receita` de persona permanece obrigatória a `personaId`. Agregações do módulo Afiliados e um card/resumo em Analytics leem `VendaAfiliado`. Opcional v1.1: espelhar comissão aprovada em `Receita` com canal `braip` se houver persona ligada — **fora** do MVP.

- *Rationale:* evita **BREAKING** em `Receita` e campos de afiliado (status de comissão, externalId) não cabem bem no modelo atual.

### D5 — Três escopos de Credencial (mutuamente exclusivos)

Estender `Credencial` com `contaTrafegoId` opcional. Regras Zod:

| Escopo | global | personaId | contaTrafegoId | ferramentaId |
|--------|--------|-----------|----------------|--------------|
| Persona | false | set | null | null |
| ContaTrafego | false | null | set | null |
| Global | true | null | null | opcional |

Listagens isoladas: persona não vê credenciais de ContaTrafego; ContaTrafego não vê globais; Ferramentas só `global=true`. Reveal + audit log inalterados.

- *Alternativa:* tabela separada — duplicaria criptografia/reveal; rejeitado.

### D6 — UI e rotas no padrão Persona hub

- Sidebar: item **Afiliados** (seção operacional, junto a PersonaForge ou Creator Engine — preferência: seção própria ou sob PersonaForge operacional; decisão de label na implementação, default `/afiliados`).
- Páginas: lista, nova, `[slug]` hub com seções Contas | Produtos | Credenciais | Vendas (e overview com totais).
- Reutilizar `CredenciaisPanel` / padrões de modal + API REST autenticada.
- Catálogo de produtos: acessível no hub da conta (associar/desassociar) e, se útil, lista global `/afiliados/produtos` para CRUD do catálogo sem estar dentro de uma conta.

### D7 — Persona opcional (gancho, sem obrigatoriedade)

`ContaTrafego.personaId` opcional **ou** junção leve ContaTrafego↔Persona na v1.1. MVP: sem vínculo formal obrigatório; operador pode anotar em `observacoes` ou associar depois quando quiser cruzar tráfego pago × persona.

### D8 — SQL idempotente + Prisma aditivo

`prisma/sql/NN-afiliados-conta-trafego.sql` para banco existente; `schema.prisma` aditivo; `db push` em dev. Sem data-loss em tabelas atuais.

## Risks / Trade-offs

- **Duplicidade conceitual Funil(persona) × ProdutoAfiliado** → documentar: Funil = monetização da persona; Produto/ContaTrafego = ops de ads/afiliado. Sem migração automática nesta change.
- **P&L global fragmentado** (Receita persona + VendaAfiliado) → Analytics/Financeiro precisam de seção ou filtro explícito “Afiliados” para não subcontar/sobrescrever.
- **N:N produto×conta** aumenta UX de associação → default: criar produto já vinculado à conta atual; tela de catálogo para reuso.
- **Escopo Credencial mais complexo** → testes Zod unitários + E2E smoke de isolamento; migration nullable segura.
- **Automação futura** → `origem` + `externalId` únicos por plataforma evitam retrabalho; não implementar ingestão agora.

## Migration Plan

1. Adicionar models/enums no Prisma + SQL idempotente → `db push` local → seed opcional de 1 ContaTrafego exemplo (sem dados sensíveis).
2. Estender `credenciais` (schema Zod + API filtros `contaTrafegoId`).
3. APIs CRUD ContaTrafego, ContaVinculada, Produto, junção, Venda.
4. UI lista/hub/seções + sidebar.
5. Cards de resumo no hub + bloco mínimo em Analytics (totais comissão 30d / alertas opcionais).
6. Deploy VPS: SQL + `db push` + restart api. **Rollback:** ocultar nav + models aditivos (sem drop forçado).

## Open Questions

- Nome na sidebar/UI: **Afiliados** vs **Tráfego** vs **Contas de Anúncio** — default **Afiliados** com hub = conta de tráfego.
- Plataformas de ads no enum ContaTrafego (`META`, `GOOGLE`, `TIKTOK_ADS`, `OUTRO`) — ajustar na implementação se o operador usar só Meta no início.
- Lista global de produtos (`/afiliados/produtos`) na v1 ou só via hub da conta — default: **ambos** (CRUD catálogo + associação no hub).
- Vínculo formal ContaTrafego↔Persona na v1 — default: **não** (gancho em change futura).
